import unpackFeature from 'caniuse-lite/dist/unpacker/feature.js';
import { packedFeatures } from './featureKeys.js';

/** @import {FeatureKey} from './featureKeys.js' */
/** @typedef {Record<string, Record<string, string>>} Stats */

/** @type {Map<string, Stats>} */
const statsByFeature = new Map();

/**
 * @param {string} key
 * @return {Stats | undefined} undefined for a key that featureKeys.js does not import
 */
function statsFor(key) {
  let stats = statsByFeature.get(key);
  if (stats === undefined) {
    if (!Object.hasOwn(packedFeatures, key)) return undefined;
    stats = unpackFeature(
      packedFeatures[/** @type {FeatureKey} */ (key)]
    ).stats;
    statsByFeature.set(key, stats);
  }
  return stats;
}

/**
 * A feature is supported when caniuse marks it `y` without a prefix flag. A
 * `y x` status needs a vendor prefix, so the unprefixed syntax is not
 * supported there. Notes such as `y #2` still count as support.
 * @param {string | undefined} status
 * @return {boolean}
 */
function isUnprefixedSupport(status) {
  if (status === undefined) return false;
  const tokens = status.split(' ');
  return tokens[0] === 'y' && !tokens.includes('x');
}

/**
 * @param {Stats} stats
 * @param {string} target
 * @return {boolean}
 */
function supportsTarget(stats, target) {
  const space = target.indexOf(' ');
  return isUnprefixedSupport(
    stats[target.slice(0, space)]?.[target.slice(space + 1)]
  );
}

/** @type {WeakMap<readonly string[], Map<string, boolean>>} */
const supportCache = new WeakMap();

/**
 * Whether every target supports the feature, judged by the installed
 * caniuse-lite. An entry that caniuse-lite does not list counts as
 * unsupported, so it never lets a feature through; an empty list is
 * unsupported too. Plugins that keep fallbacks, such as merge-longhand,
 * instead assume an unknown engine may understand a property; both choices
 * keep the output safe for that engine.
 * Answers are cached by the identity of the list, so the list must not change
 * after the first call.
 * @param {readonly string[]} targets browserslist entries such as "safari 26.5"
 * @param {FeatureKey} feature
 * @return {boolean}
 */
export function supportsAll(targets, feature) {
  let byFeature = supportCache.get(targets);
  if (byFeature === undefined) {
    byFeature = new Map();
    supportCache.set(targets, byFeature);
  }
  let answer = byFeature.get(feature);
  if (answer === undefined) {
    answer = checkSupportsAll(targets, feature);
    byFeature.set(feature, answer);
  }
  return answer;
}

/**
 * Whether there are targets and every one passes the test. An empty list
 * means the targets are unknown, so no target can vouch for anything.
 * @param {readonly string[]} targets browserslist entries such as "ie 8"
 * @param {(entry: string) => boolean} test
 * @return {boolean}
 */
export function everyTarget(targets, test) {
  return targets.length > 0 && targets.every(test);
}

/**
 * @param {readonly string[]} targets
 * @param {string} key
 * @return {boolean}
 */
function checkSupportsAll(targets, key) {
  const stats = statsFor(key);
  if (stats === undefined) {
    throw new RangeError(`Unknown caniuse feature key: ${key}`);
  }
  return everyTarget(targets, (target) => supportsTarget(stats, target));
}
