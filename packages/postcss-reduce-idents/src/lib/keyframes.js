'use strict';
const valueParser = require('postcss-value-parser');
const addToCache = require('./cache');

const RESERVED_KEYWORDS = new Set(['none', 'inherit', 'initial', 'unset']);
const keyframesRegex = /keyframes/i;
const animationRegex = /animation/i;

/**
 * @return {import('../index.js').Reducer}
 */
module.exports = function () {
  /** @type {Record<string, {ident: string, count: number}>} */
  const cache = {};
  /** @type {import('postcss').AtRule[]} */
  let atRules = [];
  /** @type {import('postcss').Declaration[]} */
  let decls = [];

  return {
    collect(node, encoder) {
      const { type } = node;

      if (
        type === 'atrule' &&
        keyframesRegex.test(node.name) &&
        !RESERVED_KEYWORDS.has(node.params.toLowerCase())
      ) {
        addToCache(node.params, encoder, cache);
        atRules.push(node);
      }
      if (type === 'decl' && animationRegex.test(node.prop)) {
        decls.push(node);
      }
    },

    transform() {
      const referenced = new Set();

      // Iterate each property and change their names
      for (const decl of decls) {
        decl.value = valueParser(decl.value)
          .walk((node) => {
            if (node.type === 'word' && node.value in cache) {
              if (!referenced.has(node.value)) {
                referenced.add(node.value);
              }

              cache[node.value].count++;
              node.value = cache[node.value].ident;
            }
          })
          .toString();
      }

      // Iterate each at rule and change their name if references to them have been found
      for (const rule of atRules) {
        const cached = cache[rule.params];

        if (cached && cached.count > 0 && referenced.has(rule.params)) {
          rule.params = cached.ident;
        }
      }

      // reset cache after transform
      atRules = [];
      decls = [];
    },
  };
};
