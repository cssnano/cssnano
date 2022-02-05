'use strict';
const valueParser = require('postcss-value-parser');
const addToCache = require('./cache');

const RESERVED_KEYWORDS = ['none', 'inherit', 'initial', 'unset'];

module.exports = function () {
  let cache = {};
  let atRules = [];
  let decls = [];

  return {
    collect(node, encoder) {
      const { name, prop, type } = node;

      if (
        type === 'atrule' &&
        /keyframes/i.test(name) &&
        RESERVED_KEYWORDS.indexOf(node.params.toLowerCase()) === -1
      ) {
        addToCache(node.params, encoder, cache);
        atRules.push(node);
      }

      if (type === 'decl' && /animation/i.test(prop)) {
        decls.push(node);
      }
    },

    transform() {
      const referenced = new Set();

      // Iterate each property and change their names
      decls.forEach((decl) => {
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
      });

      // Iterate each at rule and change their name if references to them have been found
      atRules.forEach((rule) => {
        const cached = cache[rule.params];

        if (cached && cached.count > 0 && referenced.has(rule.params)) {
          rule.params = cached.ident;
        }
      });

      // reset cache after transform
      atRules = [];
      decls = [];
    },
  };
};
