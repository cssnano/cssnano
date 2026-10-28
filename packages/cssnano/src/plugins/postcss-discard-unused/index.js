import {
  isTokenComment,
  isTokenComma,
  isTokenDelim,
  isTokenIdent,
  isTokenWhitespace,
} from '@csstools/css-tokenizer';
import { list } from 'postcss';
import cssnanoUtils from '#utils';
import { createSymbolLists, symbolVisit } from '../../pipeline/symbolLists.js';
import { TextTable } from '../../values/textTable.js';

/** @import {AtRule, Declaration} from 'postcss' */
/** @import {SymbolLists} from '../../pipeline/symbolLists.js' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */

const { asciiLowerCase } = cssnanoUtils;
const wildcard = true;

/**
 * The names that the declarations reference, split on commas and spaces.
 *
 * @param {Declaration[]} decls
 * @return {Set<string>}
 */
function referencedNames(decls) {
  /** @type {Set<string>} */
  const names = new Set();
  for (const { value } of decls) {
    for (const item of list.comma(value)) {
      for (const name of list.space(item)) names.add(name);
    }
  }
  return names;
}

/**
 * @param {AtRule[]} atRules
 * @param {Set<string>} names
 * @param {(node: AtRule) => void} remove
 * @return {void}
 */
function filterAtRule(atRules, names, remove) {
  for (const node of atRules) {
    if (!names.has(node.params)) remove(node);
  }
}

/**
 * @param {readonly CSSToken[]} prelude the tokens of the @namespace prelude
 * @return {string | true | undefined}
 */
function namespacePrefix(prelude) {
  for (const token of prelude) {
    if (isTokenWhitespace(token) || isTokenComment(token)) continue;
    return namespacePrefixToken(token);
  }
}

/**
 * @param {import('@csstools/css-tokenizer').CSSToken | undefined} token
 * @return {string | true | undefined}
 */
function namespacePrefixToken(token) {
  if (token === undefined) return;
  if (isTokenIdent(token)) return token[4].value;
  if (isTokenDelim(token) && token[1] === '*') return wildcard;
}

/**
 * Find namespace prefixes in each selector-list item. A comma resets the
 * candidate prefix so a type selector in an earlier item cannot be mistaken
 * for the prefix of a later qualified selector. Whitespace also resets it,
 * since qualified names cannot contain whitespace. Comments are removed before
 * parsing, so they do not reset it.
 *
 * @param {readonly CSSToken[]} tokens the tokens of the selector as written
 * @return {(string | true)[]}
 */
function namespacePrefixes(tokens) {
  /** @type {(string | true)[]} */
  const prefixes = [];
  /** @type {import('@csstools/css-tokenizer').CSSToken | undefined} */
  let previous;
  /** @type {string | true | undefined} */
  let pendingPrefix;

  for (const token of tokens) {
    if (isTokenComment(token)) continue;
    if (isTokenComma(token)) {
      previous = undefined;
      pendingPrefix = undefined;
      continue;
    }
    if (isTokenWhitespace(token)) {
      previous = undefined;
      pendingPrefix = undefined;
      continue;
    }

    if (pendingPrefix !== undefined) {
      if (isTokenIdent(token) || (isTokenDelim(token) && token[1] === '*')) {
        prefixes.push(pendingPrefix);
      }
      pendingPrefix = undefined;
    }

    if (isTokenDelim(token) && token[1] === '|') {
      pendingPrefix = namespacePrefixToken(previous);
      previous = undefined;
      continue;
    }

    previous = token;
  }

  return prefixes;
}

/**
 * @param {AtRule[]} atRules
 * @param {Set<string | true>} prefixes
 * @param {(node: AtRule) => void} remove
 * @param {TextTable} table the @namespace preludes the walk stored
 * @return {void}
 */
function filterNamespace(atRules, prefixes, remove, table) {
  const usesAny = prefixes.has(wildcard);
  for (const atRule of atRules) {
    const prefix = namespacePrefix(table.tokens(atRule));

    if (prefix === undefined) {
      if (!atRule.params.trim()) remove(atRule);
    } else if (!usesAny && !prefixes.has(prefix)) {
      remove(atRule);
    }
  }
}

/**
 * A family is used when any font name in use contains it.
 *
 * @param {string} fontFamily
 * @param {string[]} fonts
 * @return {boolean}
 */
function hasFont(fontFamily, fonts) {
  return list
    .comma(fontFamily)
    .some((font) => fonts.some((used) => used.includes(font)));
}

/**
 * A `@font-face` stays only when it names a family and every family it names
 * is in use.
 *
 * @param {AtRule[]} atRules
 * @param {Declaration[]} decls
 * @param {(node: AtRule) => void} remove
 * @return {void}
 */
function filterFont(atRules, decls, remove) {
  /** @type {Set<string>} */
  const used = new Set();
  for (const { value } of decls) {
    for (const font of list.comma(asciiLowerCase(value))) used.add(font);
  }
  const fonts = [...used];
  for (const atRule of atRules) {
    const families = /** @type {Declaration[]} */ (
      /** @type {import('postcss').ChildNode[]} */ (atRule.nodes).filter(
        (node) =>
          node.type === 'decl' && asciiLowerCase(node.prop) === 'font-family'
      )
    );
    if (
      families.length === 0 ||
      families.some((family) => !hasFont(asciiLowerCase(family.value), fonts))
    ) {
      remove(atRule);
    }
  }
}

/**
 * @typedef {object} Options
 * @property {boolean} [fontFace] Discards unused font face rules. (default: true)
 * @property {boolean} [counterStyle] Discards unused counter style rules. (default: true)
 * @property {boolean} [keyframes] Discards unused keyframe rules. (default: true)
 * @property {boolean} [namespace] Discards unused namespace rules. (default: true)
 */

/**
 * Removes the at-rules that define a name nothing references. Every reference
 * is read before the first removal, so a reference inside a removed at-rule
 * still keeps its definition.
 *
 * @param {SymbolLists} lists
 * @param {Options} options
 * @param {(node: AtRule) => void} remove
 * @param {TextTable} table the selector tokens the walk stored
 * @return {void}
 */
export function discardUnusedSymbols(lists, options, remove, table) {
  const { fontFace, counterStyle, keyframes, namespace } = {
    fontFace: true,
    counterStyle: true,
    keyframes: true,
    namespace: true,
    ...options,
  };
  const counterStyleNames = counterStyle
    ? referencedNames(lists.listStyleDecls)
    : undefined;
  const keyframesNames = keyframes
    ? referencedNames(lists.animationDecls)
    : undefined;
  /** @type {Set<string | true>} */
  const prefixes = new Set();
  if (namespace) {
    for (const rule of lists.namespaceRules) {
      for (const prefix of namespacePrefixes(table.tokens(rule))) {
        prefixes.add(prefix);
      }
    }
  }

  if (counterStyleNames) {
    filterAtRule(lists.counterStyles, counterStyleNames, remove);
  }
  if (fontFace) filterFont(lists.fontFaces, lists.fontDecls, remove);
  if (keyframesNames) filterAtRule(lists.keyframes, keyframesNames, remove);
  if (namespace) filterNamespace(lists.namespaces, prefixes, remove, table);
}

/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts) {
  return {
    postcssPlugin: 'postcss-discard-unused',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const lists = createSymbolLists();
      css.walk(symbolVisit(lists));
      discardUnusedSymbols(
        lists,
        opts,
        (node) => node.remove(),
        new TextTable()
      );
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
