import valueParser, { walk } from 'postcss-value-parser';
import addToCache from './cache';
import isNum from './isNum';

const RESERVED_KEYWORDS = ['unset', 'initial', 'inherit', 'none'];

export default function() {
  let cache = {};
  let declOneCache = [];
  let declTwoCache = [];

  return {
    collect(node, encoder) {
      const { prop, type } = node;

      if (type !== 'decl') {
        return;
      }

      if (/counter-(reset|increment)/i.test(prop)) {
        node.value = valueParser(node.value).walk((child) => {
          if (
            child.type === 'word' &&
            !isNum(child) &&
            RESERVED_KEYWORDS.indexOf(child.value.toLowerCase()) === -1
          ) {
            addToCache(child.value, encoder, cache);

            child.value = cache[child.value].ident;
          }
        });

        declOneCache.push(node);
      } else if (/content/i.test(prop)) {
        declTwoCache.push(node);
      }
    },

    transform() {
      declTwoCache.forEach((decl) => {
        decl.value = valueParser(decl.value)
          .walk((node) => {
            const { type } = node;

            const value = node.value.toLowerCase();

            if (
              type === 'function' &&
              (value === 'counter' || value === 'counters')
            ) {
              walk(node.nodes, (child) => {
                if (child.type === 'word' && child.value in cache) {
                  cache[child.value].count++;

                  child.value = cache[child.value].ident;
                }
              });
            }

            if (type === 'space') {
              node.value = ' ';
            }

            return false;
          })
          .toString();
      });

      declOneCache.forEach((decl) => {
        decl.value = decl.value
          .walk((node) => {
            if (node.type === 'word' && !isNum(node)) {
              Object.keys(cache).forEach((key) => {
                const cached = cache[key];

                if (cached.ident === node.value && !cached.count) {
                  node.value = key;
                }
              });
            }
          })
          .toString();
      });

      // reset cache after transform
      declOneCache = [];
      declTwoCache = [];
    },
  };
}
