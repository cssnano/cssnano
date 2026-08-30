import valueParser from 'postcss-value-parser';
import addToCache from './cache.js';
import isNum from './isNum.js';
import functionArguments from './functionArguments.js';
import { counter, cssWideKeywords, resolveProperty } from './slots.js';

// `list-item` and `page` are counters the user agent itself maintains, and the
// specification introduces them in prose rather than in a grammar, so webref
// has no data for them and they stay listed here. Renaming either detaches a
// `counter-reset` from the numbering it was meant to control.
const RESERVED_KEYWORDS = new Set([
  ...cssWideKeywords,
  ...counter.reservedKeywords,
  'list-item',
  'page',
]);
export default (function () {
  /** @type {Map<string, {ident: string, count: number}>} */
  const cache = new Map();
  /** @type {import('postcss').Declaration[]} */
  let declOneCache = [];
  /** @type {import('postcss').Declaration[]} */
  let declTwoCache = [];
  /** @type {WeakMap<import('postcss').Declaration, import('postcss-value-parser').ParsedValue>} */
  const parsedValues = new WeakMap();

  return {
    /**
     * @param {import('postcss').AnyNode} node
     * @param {(value: string, index: number) => string} encoder
     */
    collect(node, encoder) {
      const { type } = node;

      if (type !== 'decl') {
        return;
      }
      const prop = resolveProperty(node.prop);

      if (counter.properties.has(prop)) {
        const parsed = valueParser(node.value);
        parsed.walk((child) => {
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
        });
        parsedValues.set(node, parsed);

        declOneCache.push(node);
      } else if (counter.functionProperties.has(prop)) {
        parsedValues.set(node, valueParser(node.value));
        declTwoCache.push(node);
      }
    },

    transform() {
      for (const decl of declTwoCache) {
        const parsed = parsedValues.get(decl);
        if (!parsed) continue;
        decl.value = parsed
          .walk((node) => {
            const { type } = node;

            if (type === 'function') {
              // Only the arguments that name a counter are renamed: the others
              // hold a counter style, a separator string or a link target,
              // which a counter of the same name must not be confused with.
              const args = counter.functions.get(node.value.toLowerCase());

              if (args) {
                const parsedArgs = functionArguments(node);

                for (const index of args) {
                  for (const child of parsedArgs[index] ?? []) {
                    const cached =
                      child.type === 'word' && cache.get(child.value);
                    if (cached) {
                      cached.count++;

                      child.value = cached.ident;
                    }
                  }
                }
              }
            }

            if (type === 'space') {
              node.value = ' ';
            }

            return false;
          })
          .toString();
      }

      for (const decl of declOneCache) {
        const parsed = parsedValues.get(decl);
        if (!parsed) continue;
        decl.value = parsed
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
});
