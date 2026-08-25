import valueParser from './parse.js';
import addToCache from './cache.js';
import {
  cssWideKeywords,
  keyframes,
  resolveAtRule,
  resolveProperty,
} from './slots.js';

const RESERVED_KEYWORDS = new Set([
  ...cssWideKeywords,
  ...keyframes.reservedKeywords,
]);
export default (function () {
  /** @type {Map<string, {ident: string, count: number}>} */
  const cache = new Map();
  /** @type {import('postcss').AtRule[]} */
  let atRules = [];
  /** @type {import('postcss').Declaration[]} */
  let decls = [];

  return {
    collect(node, encoder) {
      const { type } = node;

      if (
        type === 'atrule' &&
        resolveAtRule(node.name) === keyframes.atRule &&
        !RESERVED_KEYWORDS.has(node.params.toLowerCase())
      ) {
        addToCache(node.params, encoder, cache);
        atRules.push(node);
      }
      // Only `animation` and `animation-name` take a keyframes name; the rest
      // of the animation family holds keywords of its own, which a name that
      // happens to look like one must not be renamed into.
      if (
        type === 'decl' &&
        keyframes.properties.has(resolveProperty(node.prop))
      ) {
        decls.push(node);
      }
    },

    transform() {
      const referenced = new Set();

      // Iterate each property and change their names
      for (const decl of decls) {
        decl.value = valueParser(decl.value)
          .walk((node) => {
            const cached = node.type === 'word' && cache.get(node.value);
            if (cached) {
              if (!referenced.has(node.value)) {
                referenced.add(node.value);
              }

              cached.count++;
              node.value = cached.ident;
            }
          })
          .toString();
      }

      // Iterate each at rule and change their name if references to them have been found
      for (const rule of atRules) {
        const cached = cache.get(rule.params);

        if (cached && cached.count > 0 && referenced.has(rule.params)) {
          rule.params = cached.ident;
        }
      }

      // reset cache after transform
      atRules = [];
      decls = [];
    },
  };
});
