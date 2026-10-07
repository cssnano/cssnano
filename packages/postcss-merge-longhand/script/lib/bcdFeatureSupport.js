/**
 * Derives, from @mdn/browser-compat-data, the first version of each browser
 * that parses the newer syntax `isFallback` tracks: units, CSS-wide keywords,
 * math constants and alpha hex colours. When every browserslist target
 * reaches that version, an earlier declaration is no fallback for the syntax.
 *
 * browserslist resolves targets with caniuse, which sometimes records support
 * later than browser-compat-data; where both cover a feature, the later
 * version wins.
 */
import { serializeJson } from '../../../../util/webref/webref.js';
import { compareVersions } from '../../src/lib/compareVersions.js';
import { longstandingFloor as floorByBrowserslistName } from '../../src/lib/targetSupport.js';
import {
  browserslistNames,
  lookup,
  plainVersion,
  standardSupportSince,
  supportOf,
} from './bcdSupport.js';

/**
 * @param {string} name - a BCD unit entry
 * @param {string[]} units
 * @return {[string, string][]}
 */
function unitsAt(name, units) {
  return units.map((unit) => [`unit:${unit}`, `css.types.length.${name}`]);
}

/**
 * Feature → dotted BCD path. Unit spellings are case-insensitive, so the
 * features are lowercase even where BCD spells the key `Q`.
 *
 * @type {ReadonlyMap<string, string>}
 */
export const featureBcdPaths = new Map([
  ...unitsAt('viewport_percentage_units_dynamic', [
    'dvh',
    'dvw',
    'dvi',
    'dvb',
    'dvmin',
    'dvmax',
  ]),
  ...unitsAt('viewport_percentage_units_small', [
    'svh',
    'svw',
    'svi',
    'svb',
    'svmin',
    'svmax',
  ]),
  ...unitsAt('viewport_percentage_units_large', [
    'lvh',
    'lvw',
    'lvi',
    'lvb',
    'lvmin',
    'lvmax',
  ]),
  ...unitsAt('container_query_length_units', [
    'cqw',
    'cqh',
    'cqi',
    'cqb',
    'cqmin',
    'cqmax',
  ]),
  ['unit:q', 'css.types.length.Q'],
  ...['vw', 'vh', 'vmin', 'vmax', 'ch'].map(
    (unit) =>
      /** @type {[string, string]} */ ([
        `unit:${unit}`,
        `css.types.length.${unit}`,
      ])
  ),
  ['unit:dppx', 'css.types.resolution.dppx'],
  ['unit:dpi', 'css.types.resolution.dpi'],
  ['unit:dpcm', 'css.types.resolution.dpcm'],
  ...['lh', 'rlh', 'ic', 'ric', 'cap', 'rcap', 'rch', 'rex', 'vi', 'vb'].map(
    (unit) =>
      /** @type {[string, string]} */ ([
        `unit:${unit}`,
        `css.types.length.${unit}`,
      ])
  ),
  ['keyword:initial', 'css.types.global_keywords.initial'],
  ['keyword:unset', 'css.types.global_keywords.unset'],
  ['keyword:revert', 'css.types.global_keywords.revert'],
  ['keyword:revert-layer', 'css.types.global_keywords.revert-layer'],
  // Math constants, which only a math function parses.
  ...['e', 'pi', 'infinity'].map(
    (name) =>
      /** @type {[string, string]} */ ([
        `keyword:${name}`,
        `css.types.calc-keyword.${name}`,
      ])
  ),
  ['keyword:nan', 'css.types.calc-keyword.NaN'],
  ['calc', 'css.types.calc'],
  [
    'hex-alpha',
    'css.types.color.rgb_hexadecimal_notation.alpha_hexadecimal_notation',
  ],
]);

/**
 * Tracked feature → caniuse feature id, for the features caniuse covers unit
 * by unit. Its viewport-units entry is partial wherever vmax is missing, which
 * browser-compat-data already records per unit, so it is left out.
 *
 * @type {ReadonlyMap<string, string>}
 */
export const caniuseFeatureIds = new Map([
  ['calc', 'calc'],
  ['hex-alpha', 'css-rrggbbaa'],
  ['keyword:initial', 'css-initial-value'],
  ['keyword:unset', 'css-unset-value'],
  ['keyword:revert', 'css-revert-value'],
  ['unit:ch', 'ch-unit'],
  ...['dv', 'sv', 'lv'].flatMap((prefix) =>
    ['h', 'w', 'i', 'b', 'min', 'max'].map(
      (axis) =>
        /** @type {[string, string]} */ ([
          `unit:${prefix}${axis}`,
          'viewport-unit-variants',
        ])
    )
  ),
  ...['w', 'h', 'i', 'b', 'min', 'max'].map(
    (axis) =>
      /** @type {[string, string]} */ ([
        `unit:cq${axis}`,
        'css-container-query-units',
      ])
  ),
]);

/**
 * @param {string} version - a caniuse version such as "10.0-10.2"
 * @return {[string, string]} the first and last releases the version names
 */
function releaseRange(version) {
  const [first, last = first] = version.split('-');
  return [first, last];
}

/**
 * caniuse skips releases of some browsers, such as Android WebView between
 * 4.4 and 33, so a gap is no evidence; it overrides browser-compat-data only
 * where it records a release at or after the minimum without full support.
 * Partial support counts as lacking, since it may not cover parsing.
 *
 * @param {string} minimum - from browser-compat-data
 * @param {Record<string, string>} versions - caniuse version → support status
 * @return {string | undefined} the minimum both sources allow, or undefined
 * when the latest recorded release lacks full support
 */
export function reconcileMinimum(minimum, versions) {
  const ordered = Object.keys(versions)
    .filter((version) => plainVersion.test(releaseRange(version)[0]))
    .toSorted((a, b) =>
      compareVersions(releaseRange(a)[0], releaseRange(b)[0])
    );
  const lastLacking = ordered.findLastIndex(
    (version) => !versions[version].startsWith('y')
  );
  if (ordered.length === 0 || lastLacking === ordered.length - 1) {
    return undefined;
  }
  if (
    lastLacking === -1 ||
    compareVersions(minimum, releaseRange(ordered[lastLacking])[1]) > 0
  ) {
    return minimum;
  }
  return releaseRange(ordered[lastLacking + 1])[0];
}

/**
 * Reconciles each minimum with caniuse where caniuse covers the feature.
 *
 * @param {Map<string, Map<string, string>>} features - from buildFeatureSupport
 * @param {(id: string) => Record<string, Record<string, string>>} caniuseStats
 * - caniuse support status by browserslist name and version
 * @return {Map<string, Map<string, string>>} the same map, tightened
 */
export function tightenWithCaniuse(features, caniuseStats) {
  for (const [feature, minimums] of features) {
    const id = caniuseFeatureIds.get(feature);
    if (id === undefined) continue;
    const stats = caniuseStats(id);
    for (const [browser, minimum] of minimums) {
      const reconciled = reconcileMinimum(minimum, stats[browser] ?? {});
      if (reconciled === undefined) {
        minimums.delete(browser);
      } else {
        minimums.set(browser, reconciled);
      }
    }
  }
  return features;
}

/**
 * The oldest browsers whose parsing `isFallback` treats as the baseline, in
 * BCD browser names: the plugin's floor, translated. A unit every one of them
 * parses needs no tracking above the floor; a newer one is tracked as a
 * feature. Opera Mini has no BCD data, so units it lacks, such as viewport
 * units, are tracked and never relaxed while it is a target. Frequency units
 * have no BCD data either, so they are never relaxed.
 *
 * @type {ReadonlyMap<string, string>}
 */
export const longstandingFloor = new Map(
  [...browserslistNames]
    .filter(([, name]) => Object.hasOwn(floorByBrowserslistName, name))
    .map(([bcdName, name]) => [bcdName, floorByBrowserslistName[name]])
);

/**
 * Longstanding unit → dotted BCD path. The absolute length units share the
 * `css.types.length` entry.
 *
 * @type {ReadonlyMap<string, string>}
 */
export const longstandingUnitBcdPaths = new Map([
  ...['px', 'cm', 'mm', 'in', 'pt', 'pc'].map(
    (unit) => /** @type {[string, string]} */ ([unit, 'css.types.length'])
  ),
  ...['em', 'rem', 'ex'].map(
    (unit) =>
      /** @type {[string, string]} */ ([unit, `css.types.length.${unit}`])
  ),
  ...['deg', 'rad', 'grad', 'turn'].map(
    (unit) =>
      /** @type {[string, string]} */ ([unit, `css.types.angle.${unit}`])
  ),
  ['s', 'css.types.time'],
  ['ms', 'css.types.time'],
]);

/**
 * Longstanding function → dotted BCD path. The list is the one `isFallback`
 * keeps for functions that need no support; every other function name counts
 * as newer syntax there. Unquoted `url()` is a token of its own and quoted
 * `url()` is the function.
 *
 * @type {ReadonlyMap<string, string>}
 */
export const longstandingFunctionBcdPaths = new Map([
  ['url', 'css.types.url'],
  ['rgb', 'css.types.color.rgb'],
  ['hsl', 'css.types.color.hsl'],
]);

/**
 * @param {unknown} bcd
 * @return {Map<string, Map<string, string>>} feature → browserslist name →
 * minimum version; a browser BCD gives no standard support is left out
 */
export function buildFeatureSupport(bcd) {
  /** @type {Map<string, Map<string, string>>} */
  const features = new Map();
  for (const [feature, path] of featureBcdPaths) {
    const support = supportOf(lookup(bcd, path));
    /** @type {Map<string, string>} */
    const minimums = new Map();
    for (const [bcdName, browserslistName] of browserslistNames) {
      const statements = support?.[bcdName];
      const since = statements && standardSupportSince(statements);
      if (since !== undefined) minimums.set(browserslistName, since);
    }
    features.set(feature, minimums);
  }
  return features;
}

/** @param {Map<string, Map<string, string>>} data @return {void} */
export function validateFeatureSupport(data) {
  for (const [feature, minimums] of data) {
    for (const engine of ['chrome', 'firefox', 'safari']) {
      if (!minimums.has(engine)) {
        throw new Error(`BCD lists no ${feature} support for ${engine}`);
      }
    }
  }
}

/**
 * @param {Map<string, Map<string, string>>} data
 * @return {string}
 */
export function serializeFeatureSupport(data) {
  const sorted = [...data].toSorted(([a], [b]) => a.localeCompare(b));
  const object = Object.fromEntries(
    sorted.map(([feature, minimums]) => [
      feature,
      Object.fromEntries(
        [...minimums].toSorted(([a], [b]) => a.localeCompare(b))
      ),
    ])
  );
  return serializeJson(object);
}
