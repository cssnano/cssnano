import addToCache from './cache.js';
import {
  argumentsOf,
  isIdentifier,
  name,
  parse,
  serialize,
  walk,
} from './components.js';
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
      const rename = (node, replacements) => {
        if (!isIdentifier(node)) return;
        const cached = cache.get(node.value[1]);
        if (cached) {
          cached.count++;
          replacements.set(node, cached.ident);
        }
      };

      // Iterate each property and change their names
      for (const decl of decls) {
        const values = parse(decl.value);
        const replacements = new Map();
        walk(values, (node) => {
          rename(node, replacements);
          // A function holds values of its own, such as `symbols()` strings.
          return false;
        });
        decl.value = serialize(values, replacements);
      }

      // `content` and its kin name a counter style at one argument of a
      // counter function, and something else at the others
      for (const decl of functionDecls) {
        const values = parse(decl.value);
        const replacements = new Map();
        walk(values, (node) => {
          const args = counterStyle.functions.get(name(node));
          if (!args) return;
          const parsed = argumentsOf(node);
          for (const index of args) {
            for (const child of parsed[index] ?? [])
              rename(child, replacements);
          }
        });
        decl.value = serialize(values, replacements);
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
