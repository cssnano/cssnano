/**
 * Derives, from @mdn/browser-compat-data, the first version of each browser
 * that supports every place-* shorthand, and the alignment keywords the
 * reducer may emit in one, unprefixed and unflagged. The plugin only
 * synthesizes place-* when all browserslist targets reach that version.
 */
import { compareVersions } from '../../src/lib/compareVersions.js';

/**
 * @typedef {{
 *   version_added: string | boolean | null,
 *   version_removed?: string | boolean | null,
 *   flags?: unknown[],
 *   prefix?: string,
 *   alternative_name?: string,
 *   partial_implementation?: boolean,
 * }} SupportStatement
 * @typedef {{ __compat?: { support: Record<string, SupportStatement | SupportStatement[]> } }} CompatEntry
 * @typedef {{ css: { properties: Record<string, CompatEntry & Record<string, CompatEntry>> } }} CompatData
 */

export const placeShorthands = ['place-content', 'place-items', 'place-self'];

/* Layout modes in which the longhands have long applied, so a shorthand that
 * lags behind them there would drop alignment the longhands kept. Keyword
 * subfeatures such as anchor-center are the reducer's concern. */
const layoutContexts = ['flex_context', 'grid_context'];

const alignmentLonghands = [
  'align-content',
  'justify-content',
  'align-items',
  'justify-items',
  'align-self',
  'justify-self',
];

/**
 * A place-* shorthand is dropped whole for one keyword the engine cannot
 * parse, so keywords the reducer treats as widely supported must parse
 * wherever the shorthand does. BCD names these subfeatures after the keyword,
 * with underscores for spaces. Subfeatures such as `start_end` describe flex
 * layout behavior, not parsing, and are deliberately left out.
 */
export const requiredKeywordSubfeatures = new Set([
  'space-evenly',
  'first_baseline',
]);

/**
 * The keyword subfeatures BCD records for the alignment longhands in each
 * layout context, by subfeature name.
 *
 * @param {CompatData} bcd
 * @return {Generator<[string, CompatEntry]>}
 */
export function* alignmentKeywordSubfeatures(bcd) {
  for (const longhand of alignmentLonghands) {
    for (const context of layoutContexts) {
      yield* Object.entries(bcd.css.properties[longhand]?.[context] ?? {});
    }
  }
}

/**
 * @param {CompatData} bcd
 * @return {CompatEntry[]}
 */
function keywordEntries(bcd) {
  return alignmentKeywordSubfeatures(bcd)
    .filter(([name]) => requiredKeywordSubfeatures.has(name))
    .map(([, entry]) => entry)
    .toArray();
}

/** BCD browser identifiers keyed to the browserslist names of the same engines. */
export const browserslistNames = new Map([
  ['chrome', 'chrome'],
  ['chrome_android', 'and_chr'],
  ['edge', 'edge'],
  ['firefox', 'firefox'],
  ['firefox_android', 'and_ff'],
  ['opera', 'opera'],
  ['opera_android', 'op_mob'],
  ['safari', 'safari'],
  ['safari_ios', 'ios_saf'],
  ['samsunginternet_android', 'samsung'],
  ['webview_android', 'android'],
]);

const plainVersion = /^\d+(?:\.\d+)*$/v;

/**
 * The earliest version with standard support, or undefined. A ranged
 * version such as "≤79" only bounds support from above, so its bound is used.
 *
 * @param {SupportStatement | SupportStatement[]} support
 * @return {string | undefined}
 */
function standardSupportSince(support) {
  /** @type {string | undefined} */
  let earliest;
  for (const statement of [support].flat()) {
    if (
      statement.flags ||
      statement.prefix ||
      statement.alternative_name ||
      statement.partial_implementation ||
      statement.version_removed ||
      typeof statement.version_added !== 'string'
    ) {
      continue;
    }
    const version = statement.version_added.replace(/^≤/v, '');
    if (!plainVersion.test(version)) continue;
    if (earliest === undefined || compareVersions(version, earliest) < 0) {
      earliest = version;
    }
  }
  return earliest;
}

/**
 * @param {CompatData} bcd
 * @return {Map<string, string>} browserslist name → minimum version
 */
export function buildPlaceSupport(bcd) {
  /** @type {Map<string, string>} */
  const minimums = new Map();
  for (const [bcdName, browserslistName] of browserslistNames) {
    /** @type {string | undefined} */
    let required;
    const entries = [
      ...placeShorthands.flatMap((shorthand) => {
        const property = bcd.css.properties[shorthand];
        // A context BCD does not list adds no requirement of its own.
        const contexts = layoutContexts.map((context) => property?.[context]);
        return [property, ...contexts.filter((entry) => entry !== undefined)];
      }),
      ...keywordEntries(bcd),
    ];
    for (const entry of entries) {
      // BCD names its compatibility record __compat.
      // eslint-disable-next-line no-underscore-dangle
      const support = entry?.__compat?.support[bcdName];
      const since = support && standardSupportSince(support);
      if (since === undefined) {
        required = undefined;
        break;
      }
      if (required === undefined || compareVersions(since, required) > 0) {
        required = since;
      }
    }
    if (required !== undefined) minimums.set(browserslistName, required);
  }
  return minimums;
}

/** @param {Map<string, string>} data @return {void} */
export function validatePlaceSupport(data) {
  for (const engine of ['chrome', 'firefox', 'safari']) {
    if (!data.has(engine)) {
      throw new Error(`BCD lists no place-* support for ${engine}`);
    }
  }
}

/** @param {Map<string, string>} data @return {string} */
export function serializePlaceSupport(data) {
  const sorted = [...data].toSorted(([a], [b]) => a.localeCompare(b));
  return `${JSON.stringify(Object.fromEntries(sorted), null, 2)}\n`;
}
