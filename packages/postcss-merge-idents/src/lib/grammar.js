import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import specData from '../data/mergeIdents.json' with { type: 'json' };

const { asciiLowerCase, decoded, tokens } = cssnanoUtils;

const VENDOR_PREFIX = /^-(webkit|moz|o)-/v;

const CSS_WIDE_KEYWORDS = new Set(specData.cssWideKeywords);

const KEYFRAMES_NAME_RESERVED = new Set([
  ...CSS_WIDE_KEYWORDS,
  'default',
  'none',
]);

// css-animations-2 spells <single-animation-composition> only in the
// animation-composition property grammar; the shorthand grammar webref gives
// does not reach it yet, so these keywords stay hand-written.
const ANIMATION_COMPOSITION_KEYWORDS = new Set([
  'accumulate',
  'add',
  'replace',
]);

const KEYFRAMES_SHORTHAND_KEYWORDS = new Set([
  ...CSS_WIDE_KEYWORDS,
  ...specData.keyframes.shorthandKeywords,
  ...ANIMATION_COMPOSITION_KEYWORDS,
]);

const COUNTER_STYLE_NAME_RESERVED = new Set([
  ...CSS_WIDE_KEYWORDS,
  'default',
  'decimal',
  'none',
]);

// The predefined counter style names are specified in prose (CSS Counter
// Styles Level 3 §6) rather than in any grammar, so webref cannot list them.
const PREDEFINED_COUNTER_STYLES = [
  'arabic-indic',
  'armenian',
  'bengali',
  'cambodian',
  'circle',
  'cjk-decimal',
  'cjk-earthly-branch',
  'cjk-heavenly-stem',
  'cjk-ideographic',
  'decimal',
  'decimal-leading-zero',
  'devanagari',
  'disc',
  'disclosure-closed',
  'disclosure-open',
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
  'lower-alpha',
  'lower-armenian',
  'lower-greek',
  'lower-latin',
  'lower-roman',
  'malayalam',
  'mongolian',
  'myanmar',
  'oriya',
  'persian',
  'simp-chinese-formal',
  'simp-chinese-informal',
  'square',
  'tamil',
  'telugu',
  'thai',
  'tibetan',
  'trad-chinese-formal',
  'trad-chinese-informal',
  'upper-alpha',
  'upper-armenian',
  'upper-latin',
  'upper-roman',
];

const COUNTER_STYLE_RESERVED = new Set([
  ...CSS_WIDE_KEYWORDS,
  ...specData.counterStyle.keywords,
  ...PREDEFINED_COUNTER_STYLES,
]);

const COUNTER_STYLE_FUNCTIONS = new Map(
  Object.entries(specData.counterStyle.functions).map(([name, args]) => [
    // Stylesheets spell a function without the trailing `()` webref names it
    // by, preserving the historical lookup behavior.
    name.slice(0, -2),
    args,
  ])
);

/**
 * @param {string} params
 * @param {string} atRuleName
 * @return {{ isString: boolean, isReservedName: boolean, key: string, tokenText: string } | null}
 */
function parseAtRuleName(params, atRuleName) {
  const tokenList = tokens(params).filter(
    (t) => t[0] !== TokenType.Whitespace && t[0] !== TokenType.Comment
  );
  if (tokenList.length !== 1) {
    return null;
  }
  const isCounterStyle = atRuleName.endsWith('counter-style');
  const first = tokenList[0];
  if (first[0] === TokenType.Ident) {
    const val = decoded(first);
    const lower = asciiLowerCase(val);
    const isReserved = isCounterStyle
      ? COUNTER_STYLE_NAME_RESERVED.has(lower)
      : KEYFRAMES_NAME_RESERVED.has(lower);
    if (isReserved) {
      return null;
    }
    const isReservedName = isCounterStyle
      ? COUNTER_STYLE_RESERVED.has(lower)
      : KEYFRAMES_SHORTHAND_KEYWORDS.has(lower) || val.startsWith('--');
    return {
      isString: false,
      isReservedName,
      key: val,
      tokenText: first[1],
    };
  }
  if (!isCounterStyle && first[0] === TokenType.String) {
    const val = /** @type {{value: string}} */ (first[4]).value;
    return {
      isString: true,
      // In the animation shorthand a `--x` ident is a timeline name, not a
      // keyframes name, so a string spelling one is never rewritten and its
      // definition must stay.
      isReservedName: val.startsWith('--'),
      key: val,
      tokenText: first[1],
    };
  }
  return null;
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {string} [prop] the lowercase property name, when already known
 * @return {{ namespace: 'keyframes' | 'counter-style', kind: 'animation-shorthand' | 'animation-name' | 'counter-style' | 'counter-style-func' } | null}
 */
function classifyDeclaration(decl, prop = asciiLowerCase(decl.prop)) {
  if (prop.startsWith('--')) {
    return null;
  }

  const unprefixed = prop.replace(VENDOR_PREFIX, '');

  if (unprefixed === 'animation') {
    return { namespace: 'keyframes', kind: 'animation-shorthand' };
  }
  if (unprefixed === 'animation-name') {
    return { namespace: 'keyframes', kind: 'animation-name' };
  }
  if (unprefixed === 'list-style' || unprefixed === 'list-style-type') {
    return { namespace: 'counter-style', kind: 'counter-style' };
  }

  if (
    decl.parent?.type === 'atrule' &&
    asciiLowerCase(decl.parent.name).endsWith('counter-style')
  ) {
    if (prop === 'system' || prop === 'fallback' || prop === 'speak-as') {
      return { namespace: 'counter-style', kind: 'counter-style' };
    }
  }

  if (
    unprefixed === 'content' ||
    unprefixed === 'bookmark-label' ||
    unprefixed === 'copy-into' ||
    unprefixed === 'string-set'
  ) {
    return { namespace: 'counter-style', kind: 'counter-style-func' };
  }

  return null;
}

/**
 * The nearest ancestor that decides whether a definition applies at all.
 * Cascade layers only order definitions, so they are looked through.
 *
 * @param {import('postcss').Node} node
 * @return {import('postcss').Container}
 */
function getConditionContainer(node) {
  let curr = node.parent;
  while (
    curr?.type === 'atrule' &&
    asciiLowerCase(/** @type {import('postcss').AtRule} */ (curr).name) ===
      'layer'
  ) {
    curr = curr.parent;
  }
  return /** @type {import('postcss').Container} */ (curr);
}

/**
 * @param {{ rule: import('postcss').AtRule, body?: string }} entry an at-rule
 *   with a block
 * @return {string}
 */
function getBody(entry) {
  if (entry.body === undefined) {
    entry.body = /** @type {import('postcss').ChildNode[]} */ (
      entry.rule.nodes
    ).toString();
  }
  return entry.body;
}

export {
  VENDOR_PREFIX,
  CSS_WIDE_KEYWORDS,
  KEYFRAMES_SHORTHAND_KEYWORDS,
  COUNTER_STYLE_RESERVED,
  COUNTER_STYLE_FUNCTIONS,
  parseAtRuleName,
  classifyDeclaration,
  getConditionContainer,
  getBody,
};
