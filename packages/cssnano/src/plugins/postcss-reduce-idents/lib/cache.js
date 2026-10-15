/**
 *
 * @param {string} value
 * @param {(value: string, index: number) => string} encoder
 * @param {Map<string, string>} cache
 */
function addToCache(value, encoder, cache) {
  if (!cache.has(value)) {
    cache.set(value, encoder(value, cache.size));
  }
}

export default addToCache;
