import addToCache from './cache.js';
import {
  argumentsOf,
  isIdentifier,
  isNumeric,
  name,
  parse,
  serialize,
  walk,
} from './components.js';
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

  return {
    collect(node, encoder) {
      const { type } = node;

      if (type !== 'decl') {
        return;
      }
      const prop = resolveProperty(node.prop);

      if (counter.properties.has(prop)) {
        const values = parse(node.value);
        const replacements = new Map();
        walk(values, (child) => {
          if (!isIdentifier(child) || isNumeric(child)) return;
          const value = child.value[1];
          if (RESERVED_KEYWORDS.has(value.toLowerCase())) return;
          addToCache(value, encoder, cache);
          replacements.set(child, cache.get(value).ident);
        });
        node.value = serialize(values, replacements);
        declOneCache.push(node);
      } else if (counter.functionProperties.has(prop)) {
        declTwoCache.push(node);
      }
    },

    transform() {
      for (const decl of declTwoCache) {
        const values = parse(decl.value);
        const replacements = new Map();
        walk(values, (node) => {
          const args = counter.functions.get(name(node));
          if (!args) return;
          for (const index of args) {
            for (const child of argumentsOf(node)[index] ?? []) {
              if (!isIdentifier(child)) continue;
              const cached = cache.get(child.value[1]);
              if (cached) {
                cached.count++;
                replacements.set(child, cached.ident);
              }
            }
          }
        });
        decl.value = serialize(values, replacements).replace(/\s+/g, ' ');
      }

      for (const decl of declOneCache) {
        const values = parse(decl.value);
        const replacements = new Map();
        walk(values, (node) => {
          if (!isIdentifier(node) || isNumeric(node)) return;
          for (const [key, cached] of cache) {
            if (cached.ident === node.value[1] && !cached.count) {
              replacements.set(node, key);
            }
          }
        });
        decl.value = serialize(values, replacements);
      }

      // reset cache after transform
      declOneCache = [];
      declTwoCache = [];
    },
  };
});
