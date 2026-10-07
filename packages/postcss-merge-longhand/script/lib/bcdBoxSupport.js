/**
 * Derives, from @mdn/browser-compat-data, the first version of each browser
 * that supports each property of the box groups, unprefixed and unflagged.
 * A browser without a shorthand drops the whole declaration and with it every
 * side a set of longhands would have kept, so the plugin only synthesizes or
 * grows a shorthand when every browserslist target reaches that version. For
 * the same reason it drops a declaration that a later one overrides only when
 * every browser that understands the earlier also understands the later.
 * Engines the data does not cover may understand either, so the data lists
 * the engines it covers.
 */
import { serializeJson } from '../../../../util/webref/webref.js';
import { compareVersions } from '../../src/lib/compareVersions.js';
import {
  browserslistNames,
  standardSupportSince,
  supportOf,
} from './bcdSupport.js';

/** @typedef {import('./bcdSupport.js').CompatData} CompatData */
/** @typedef {import('./bcdSupport.js').SupportStatement} SupportStatement */

/**
 * CSS 1 and 2 define margin, padding and the offsets, so every browser parses
 * them, including ones the compatibility data omits, such as Opera Mini.
 */
export const alwaysSupported = 'always';
const sides = ['top', 'right', 'bottom', 'left'];
const css2Properties = new Set([
  ...['margin', 'padding'].flatMap((group) => [
    group,
    ...sides.map((side) => `${group}-${side}`),
  ]),
  ...sides,
]);

/**
 * A shorthand works only where the engine also knows each longhand it sets.
 *
 * @param {CompatData} bcd
 * @param {string} bcdName
 * @param {string[]} properties
 * @return {string | undefined} the first version supporting all of them
 */
function supportedSince(bcd, bcdName, properties) {
  /** @type {string | undefined} */
  let required;
  for (const property of properties) {
    const support = supportOf(bcd.css.properties[property])?.[bcdName];
    const since = support && standardSupportSince(support);
    if (since === undefined) return undefined;
    if (required === undefined || compareVersions(since, required) > 0) {
      required = since;
    }
  }
  return required;
}

/**
 * @param {CompatData} bcd
 * @param {string} property
 * @param {string[]} required - the properties that must all be supported
 * @return {string | Map<string, string>}
 */
function minimumsOf(bcd, property, required) {
  if (css2Properties.has(property)) return alwaysSupported;
  /** @type {Map<string, string>} */
  const minimums = new Map();
  for (const [bcdName, browserslistName] of browserslistNames) {
    const since = supportedSince(bcd, bcdName, required);
    if (since !== undefined) minimums.set(browserslistName, since);
  }
  return minimums;
}

/**
 * @param {CompatData} bcd
 * @param {Map<string, string[]>} shorthands - each shorthand with the
 * longhands it sets
 * @return {Map<string, string | Map<string, string>>} browserslist name →
 * minimum version, by shorthand and by longhand
 */
export function buildBoxPropertySupport(bcd, shorthands) {
  /** @type {Map<string, string | Map<string, string>>} */
  const support = new Map();
  for (const [shorthand, longhands] of shorthands) {
    support.set(
      shorthand,
      minimumsOf(bcd, shorthand, [shorthand, ...longhands])
    );
    for (const longhand of longhands) {
      support.set(longhand, minimumsOf(bcd, longhand, [longhand]));
    }
  }
  return support;
}

/**
 * Statements under another name, behind a flag or only partly implemented
 * never count as support, so only the standard one has to be definite.
 *
 * @param {SupportStatement} statement
 * @return {boolean}
 */
function isIndefinite(statement) {
  if (
    statement.prefix ||
    statement.alternative_name ||
    statement.flags ||
    statement.partial_implementation
  ) {
    return false;
  }
  return statement.version_added === null || Boolean(statement.version_removed);
}

/**
 * A covered engine without a minimum counts as lacking the property, which is
 * only safe when the data says so rather than not knowing, and when no
 * earlier version had it.
 *
 * @param {Map<string, string | Map<string, string>>} data
 * @param {CompatData} bcd
 * @return {void}
 */
export function validateBoxPropertySupport(data, bcd) {
  for (const [property, minimums] of data) {
    if (typeof minimums === 'string') continue;
    for (const engine of ['chrome', 'firefox', 'safari']) {
      if (!minimums.has(engine)) {
        throw new Error(`BCD lists no ${property} support for ${engine}`);
      }
    }
    const support = supportOf(bcd.css.properties[property]);
    for (const bcdName of browserslistNames.keys()) {
      const statements = support?.[bcdName];
      if (statements === undefined || [statements].flat().some(isIndefinite)) {
        throw new Error(
          `BCD does not settle whether ${bcdName} supports ${property}`
        );
      }
    }
  }
}

/**
 * @param {Map<string, string | Map<string, string>>} data
 * @return {string}
 */
export function serializeBoxPropertySupport(data) {
  return serializeJson({
    engines: [...browserslistNames.values()].toSorted(),
    properties: Object.fromEntries(
      [...data]
        .toSorted(([a], [b]) => a.localeCompare(b))
        .map(([property, minimums]) => [
          property,
          typeof minimums === 'string'
            ? minimums
            : Object.fromEntries(
                [...minimums].toSorted(([a], [b]) => a.localeCompare(b))
              ),
        ])
    ),
  });
}
