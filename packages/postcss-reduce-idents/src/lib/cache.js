/**
 * @param {string} value
 * @param {(value: string, index: number) => string} encoder
 * @param {Map<string, {ident: string, count: number}>} cache
 */
const addToCache = function (value, encoder, cache) {
  if (cache.has(value)) {
    return;
  }

  cache.set(value, {
    ident: encoder(value, cache.size),
    count: 0,
  });
};

export default addToCache;
