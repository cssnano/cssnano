import valueParser from 'postcss-value-parser';
import addToCache from './cache.js';
import functionArguments from './functionArguments.js';
import {
  counterStyle,
  cssWideKeywords,
  resolveAtRule,
  resolveProperty,
} from './slots.js';

// The predefined counter styles are spelled out as `@counter-style` rules in
// an appendix of the specification rather than in a grammar, so webref has no
// data for them and they stay listed here.
const RESERVED_KEYWORDS = new Set([
  ...cssWideKeywords,
  ...counterStyle.reservedKeywords,
  'inline',
  'outside',
  'disc',
  'circle',
  'square',
  'decimal',
  'cjk-decimal',
  'decimal-leading-zero',
  'lower-roman',
  'upper-roman',
  'lower-greek',
  'lower-alpha',
  'lower-latin',
  'upper-alpha',
  'upper-latin',
  'arabic-indic',
  'armenian',
  'bengali',
  'cambodian',
  'cjk-earthly-branch',
  'cjk-heavenly-stem',
  'cjk-ideographic',
  'devanagari',
  'ethiopic-numeric',
  'georgian',
  'gujarati',
  'gurmukhi',
  'hebrew',
  'hiragana',
  'hiragana-iroha',
  'japanese-formal',
  'japanese-informal',
  'kannada',
  'katakana',
  'katakana-iroha',
  'khmer',
  'korean-hangul-formal',
  'korean-hanja-formal',
  'korean-hanja-informal',
  'lao',
  'lower-armenian',
  'malayalam',
  'mongolian',
  'myanmar',
  'oriya',
  'persian',
  'simp-chinese-formal',
  'simp-chinese-informal',
  'tamil',
  'telugu',
  'thai',
  'tibetan',
  'trad-chinese-formal',
  'trad-chinese-informal',
  'upper-armenian',
  'disclosure-open',
  'disclosure-close',
]);

/**
 * True for a `@counter-style` descriptor that names another counter style,
 * such as `fallback` or `system: extends <name>`. The same words are ordinary
 * custom properties or unknown properties anywhere else, so the rule the
 * declaration sits in decides.
 *
 * @param {import('postcss').Declaration} node
 * @return {boolean}
 */
function isCounterStyleDescriptor(node) {
  const { parent } = node;

  return (
    parent !== undefined &&
    parent.type === 'atrule' &&
    resolveAtRule(parent.name) === counterStyle.atRule &&
    counterStyle.descriptors.has(node.prop.toLowerCase())
  );
}
export default (function () {
  /** @type {Map<string, {ident: string, count: number}>} */
  const cache = new Map();
  /** @type {import('postcss').AtRule[]} */
  let atRules = [];
  /** @type {import('postcss').Declaration[]} */
  let decls = [];
  /** @type {import('postcss').Declaration[]} */
  let functionDecls = [];

  return {
    /**
     * @param {import('postcss').AnyNode} node
     * @param {(value: string, index: number) => string} encoder
     */
    collect(node, encoder) {
      const { type } = node;

      if (
        type === 'atrule' &&
        resolveAtRule(node.name) === counterStyle.atRule &&
        !RESERVED_KEYWORDS.has(node.params.toLowerCase())
      ) {
        addToCache(node.params, encoder, cache);

        atRules.push(node);
      }

      if (type !== 'decl') {
        return;
      }

      if (
        counterStyle.properties.has(resolveProperty(node.prop)) ||
        isCounterStyleDescriptor(node)
      ) {
        decls.push(node);
      } else if (
        counterStyle.functionProperties.has(resolveProperty(node.prop))
      ) {
        functionDecls.push(node);
      }
    },

    transform() {
      /** @param {import('postcss-value-parser').Node} node */
      const rename = (node) => {
        const cached = node.type === 'word' && cache.get(node.value);
        if (cached) {
          cached.count++;

          node.value = cached.ident;
        }
      };

      // Iterate each property and change their names
      for (const decl of decls) {
        decl.value = valueParser(decl.value)
          .walk((node) => {
            rename(node);

            // A function holds values of its own, such as the strings of
            // `symbols()`, rather than the name of a counter style.
            return node.type !== 'function';
          })
          .toString();
      }

      // `content` and its kin name a counter style at one argument of a
      // counter function, and something else at the others
      for (const decl of functionDecls) {
        decl.value = valueParser(decl.value)
          .walk((node) => {
            if (node.type !== 'function') {
              return;
            }

            const args = counterStyle.functions.get(node.value.toLowerCase());
            if (!args) {
              return;
            }

            const parsed = functionArguments(node);
            for (const index of args) {
              for (const child of parsed[index] ?? []) {
                rename(child);
              }
            }
          })
          .toString();
      }

      // Iterate each at rule and change their name if references to them have been found
      for (const rule of atRules) {
        const cached = cache.get(rule.params);

        if (cached && cached.count > 0) {
          rule.params = cached.ident;
        }
      }

      // reset cache after transform
      atRules = [];
      decls = [];
      functionDecls = [];
    },
  };
});
