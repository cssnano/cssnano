'use strict';
/**
 * @param {string} value
 * @param {(value: string, num: number) => string} encoder
 * @param {Map<string, {ident: string, count: number}>} cache
 * @return {void}
 */
module.exports = function (value, encoder, cache) {
  if (cache.has(value)) {
    return;
  }

  cache.set(value, {
    ident: encoder(value, cache.size),
    count: 0,
  });
};
