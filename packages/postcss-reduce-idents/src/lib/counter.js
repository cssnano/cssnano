'use strict';
const valueParser = require('postcss-value-parser');
const addToCache = require('./cache');
const isNum = require('./isNum');

const RESERVED_KEYWORDS = new Set(['unset', 'initial', 'inherit', 'none']);
const counterRegex = /counter-(reset|increment|set)/i;
const contentRegex = /content/i;

/**
 * @return {import('../index.js').Reducer}
 */
module.exports = function () {
  /** @type {Map<string, {ident: string, count: number}>} */
  const cache = new Map();
  /** @type {{value: import('postcss-value-parser').ParsedValue}[]} */
  let declOneCache = [];
  /** @type {import('postcss').Declaration[]} */
  let declTwoCache = [];

  return {
    collect(node, encoder) {
      const { type } = node;

      if (type !== 'decl') {
        return;
      }
      const { prop } = node;

      if (counterRegex.test(prop)) {
        /** @type {unknown} */ (node.value) = valueParser(node.value).walk(
          (child) => {
            if (
              child.type === 'word' &&
              !isNum(child) &&
              !RESERVED_KEYWORDS.has(child.value.toLowerCase())
            ) {
              addToCache(child.value, encoder, cache);

              child.value = /** @type {{ident: string, count: number}} */ (
                cache.get(child.value)
              ).ident;
            }
          }
        );

        declOneCache.push(/** @type {any} */ (node));
      } else if (contentRegex.test(prop)) {
        declTwoCache.push(node);
      }
    },

    transform() {
      for (const decl of declTwoCache) {
        decl.value = valueParser(decl.value)
          .walk((node) => {
            const { type } = node;

            const value = node.value.toLowerCase();

            if (
              type === 'function' &&
              (value === 'counter' || value === 'counters')
            ) {
              valueParser.walk(node.nodes, (child) => {
                const cached = child.type === 'word' && cache.get(child.value);
                if (cached) {
                  cached.count++;

                  child.value = cached.ident;
                }
              });
            }

            if (type === 'space') {
              node.value = ' ';
            }

            return false;
          })
          .toString();
      }

      for (const decl of declOneCache) {
        /** @type {unknown} */ (decl.value) = decl.value
          .walk((node) => {
            if (node.type === 'word' && !isNum(node)) {
              for (const [key, cached] of cache) {
                if (cached.ident === node.value && !cached.count) {
                  node.value = key;
                }
              }
            }
          })
          .toString();
      }

      // reset cache after transform
      declOneCache = [];
      declTwoCache = [];
    },
  };
};
