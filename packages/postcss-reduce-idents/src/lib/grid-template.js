'use strict';
const valueParser = require('postcss-value-parser');
const addToCache = require('./cache');
const isNum = require('./isNum');

const RESERVED_KEYWORDS = new Set([
  'auto',
  'span',
  'inherit',
  'initial',
  'unset',
]);

/**
 * @return {import('../index.js').Reducer}
 */
module.exports = function () {
  /** @type {Record<string, {ident: string, count: number}>} */
  let cache = {};
  /** @type {import('postcss').Declaration[]} */
  let declCache = [];

  const gridChildProperties = new Set([
    'grid-area',
    'grid-column',
    'grid-row',
    'grid-column-start',
    'grid-column-end',
    'grid-row-start',
    'grid-row-end',
  ]);

  return {
    collect(node, encoder) {
      if (node.type !== 'decl') {
        return;
      }

      if (/(grid-template|grid-template-areas)/i.test(node.prop)) {
        valueParser(node.value).walk((child) => {
          if (child.type === 'string') {
            child.value.split(/\s+/).forEach((word) => {
              if (/\.+/.test(word)) {
                // reduce empty zones to a single `.`
                node.value = node.value.replace(word, '.');
              } else if (word && !RESERVED_KEYWORDS.has(word.toLowerCase())) {
                addToCache(word, encoder, cache);
              }
            });
          }
        });

        declCache.push(node);
      } else if (gridChildProperties.has(node.prop.toLowerCase())) {
        valueParser(node.value).walk((child) => {
          if (child.type === 'word' && !RESERVED_KEYWORDS.has(child.value)) {
            addToCache(child.value, encoder, cache);
          }
        });

        declCache.push(node);
      }
    },

    transform() {
      declCache.forEach((decl) => {
        decl.value = valueParser(decl.value)
          .walk((node) => {
            if (/(grid-template|grid-template-areas)/i.test(decl.prop)) {
              node.value.split(/\s+/).forEach((word) => {
                if (word in cache) {
                  node.value = node.value.replace(word, cache[word].ident);
                }
              });
              node.value = node.value.replace(/\s+/g, ' '); // merge white-spaces
            }

            if (gridChildProperties.has(decl.prop.toLowerCase()) && !isNum(node)) {
              if (node.value in cache) {
                node.value = cache[node.value].ident;
              }
            }

            return false;
          })
          .toString();
      });

      // reset cache after transform
      declCache = [];
    },
  };
};
