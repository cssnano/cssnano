import boxSupport from './data/boxPropertySupport.json' with { type: 'json' };
import {
  browserName,
  compareVersionParts,
  isDottedVersion,
  versionParts,
  versionSeparator,
} from '#utils/versions';

/** @typedef {import('#utils/versions').VersionParts} VersionParts */

const boxMinimums =
  /** @type {Record<string, string | Record<string, string>>} */ (
    boxSupport.properties
  );
/**
 * The box minimums with each version split into parts once, when the module
 * loads. Their values are fixed data, so they need no parse per target list.
 *
 * @type {Record<string, string | Record<string, VersionParts>>}
 */
const boxMinimumParts = Object.fromEntries(
  Object.entries(boxMinimums).map(([property, minimums]) => [
    property,
    typeof minimums === 'string'
      ? minimums
      : Object.fromEntries(
          Object.entries(minimums).map(([engine, version]) => [
            engine,
            versionParts(version),
          ])
        ),
  ])
);
const coveredEngines = new Set(boxSupport.engines);

/**
 * A distinct target, parsed once for every box property.
 *
 * @typedef {object} BoxTarget
 * @property {string} entry - a browserslist entry such as "safari 10.1"
 * @property {string} engine - the browserslist name, such as "safari"
 * @property {boolean} covered - whether the box data covers the engine
 * @property {boolean} preview - whether the target is TP
 * @property {VersionParts | undefined} lowest - the oldest version, or
 * undefined when it is neither dotted nor a range of dotted versions
 */

/**
 * @param {string} entry - a browserslist entry such as "safari 10.1"
 * @return {BoxTarget}
 */
function parseBoxTarget(entry) {
  const engine = browserName(entry);
  const version = entry.slice(versionSeparator(entry) + 1);
  const lowest = version.split('-')[0];
  return {
    entry,
    engine,
    covered: coveredEngines.has(engine),
    preview: version === 'TP',
    lowest: isDottedVersion(lowest) ? versionParts(lowest) : undefined,
  };
}

/**
 * @param {BoxTarget} target
 * @param {string | Record<string, VersionParts> | undefined} minimums - the
 * property's minimums, or "always" for a property every engine parses
 * @return {boolean}
 */
function reachesBoxProperty(target, minimums) {
  if (minimums === undefined) return false;
  if (typeof minimums === 'string') return true;
  if (!Object.hasOwn(minimums, target.engine)) return false;
  const minimum = minimums[target.engine];
  if (target.preview) return true;
  return (
    target.lowest !== undefined &&
    compareVersionParts(target.lowest, minimum) >= 0
  );
}

/**
 * Whether every engine parses the property, as for the CSS 1 and CSS 2 box
 * properties. Only these are safe for targets that are unknown.
 *
 * @param {string} property - a property of the box groups
 * @return {boolean}
 */
export function isUniversalBoxProperty(property) {
  return typeof boxMinimums[property] === 'string';
}

/**
 * @typedef {object} PropertySupport
 * @property {boolean} all - whether every distinct target understands it
 * @property {ReadonlySet<string>} understanding - the targets that understand it
 * @property {ReadonlySet<string>} mayUnderstanding - the targets that may
 * understand it: those that understand it, and those the data does not cover.
 * The data says nothing about some engines, such as UC Browser, so they may
 * understand any property. This is safer to assume than to deny for a fallback.
 */

/**
 * Works out each box property's support over the distinct targets, in one pass
 * per property. Built once per targetSupportOf call, so queries are lookups.
 *
 * @param {readonly string[]} browsers - browserslist entries such as "safari 10.1"
 * @return {ReadonlyMap<string, PropertySupport>}
 */
export function summarizeBoxProperties(browsers) {
  const targets = [...new Set(browsers)].map(parseBoxTarget);
  /** @type {Map<string, PropertySupport>} */
  const byProperty = new Map();
  for (const property of Object.keys(boxMinimumParts)) {
    const minimums = boxMinimumParts[property];
    /** @type {Set<string>} */
    const understanding = new Set();
    /** @type {Set<string>} */
    const mayUnderstanding = new Set();
    for (const target of targets) {
      if (reachesBoxProperty(target, minimums)) {
        understanding.add(target.entry);
        mayUnderstanding.add(target.entry);
      } else if (!target.covered) {
        mayUnderstanding.add(target.entry);
      }
    }
    byProperty.set(property, {
      all: understanding.size === targets.length,
      understanding,
      mayUnderstanding,
    });
  }
  return byProperty;
}
