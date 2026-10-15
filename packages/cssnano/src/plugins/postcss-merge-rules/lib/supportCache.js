import caniuseApi from 'caniuse-api';

const { isSupported } = caniuseApi;

const cssSel2 = 'css-sel2';
const cssSel3 = 'css-sel3';

/** @type {WeakMap<string[], Map<string, boolean>>} */
const isSupportedCache = new WeakMap();
// Stable stand-in key when `browsers` is undefined, since a fresh `[]` on
// every call would never hit the WeakMap.
/** @type {string[]} */
const noBrowsers = [];

// Move to util in future
/**
 * `browsers` is the same array reference for an entire file's processing, so
 * keying on it directly (rather than re-serializing it per call) avoids
 * rebuilding a JSON string on every lookup, including cache hits.
 *
 * @param {string} feature
 * @param {string[] | undefined} browsers
 * @return {boolean}
 */
function isSupportedCached(feature, browsers) {
  const key = browsers ?? noBrowsers;
  let byFeature = isSupportedCache.get(key);
  if (!byFeature) {
    byFeature = new Map();
    isSupportedCache.set(key, byFeature);
  }

  const cached = byFeature.get(feature);
  if (cached !== undefined) {
    return cached;
  }

  const result = isSupported(feature, /** @type {string[]} */ (browsers));
  byFeature.set(feature, result);

  return result;
}

export { isSupportedCached, cssSel2, cssSel3 };
