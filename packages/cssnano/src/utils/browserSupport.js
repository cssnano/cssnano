import unpackFeature from 'caniuse-lite/dist/unpacker/feature.js';
import { packedFeatures } from './featureKeys.js';
import { versionSeparator } from './versions.js';

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
  const separator = versionSeparator(target);
  return isUnprefixedSupport(
    stats[target.slice(0, separator)]?.[target.slice(separator + 1)]
  );
}

/**
 * An empty target list means the targets are unknown, as when a query
 * matches no browser. Every support and bug check applies this one policy, so
 * unknown targets never enable a transform that some browser may break on.
 * @param {readonly string[]} targets browserslist entries such as "safari 26.5"
 * @return {boolean}
 */
export function targetsAreUnknown(targets) {
  return targets.length === 0;
}

/** @type {WeakMap<readonly string[], Map<string, boolean>>} */
const supportCache = new WeakMap();

/**
 * Whether every target supports the feature, judged by the installed
 * caniuse-lite. A target it does not list, or an empty list, counts as
 * unsupported, so unknown browsers never let a feature through. The list must
 * not change after the first call, because answers are cached by its identity.
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
 * @param {readonly string[]} targets
 * @param {string} key
 * @return {boolean}
 */
function checkSupportsAll(targets, key) {
  const stats = statsFor(key);
  if (stats === undefined) {
    throw new RangeError(`Unknown caniuse feature key: ${key}`);
  }
  return (
    !targetsAreUnknown(targets) &&
    targets.every((target) => supportsTarget(stats, target))
  );
}
