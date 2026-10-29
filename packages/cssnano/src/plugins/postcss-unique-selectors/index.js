import { TokenType } from '@csstools/css-tokenizer';
import { sourceSelector } from '../../utils/sourceText.js';
import { comma } from '../../values/punctuationTokens.js';
import { renumber } from '../../values/renumber.js';
import { TextTable } from '../../values/textTable.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * A comment between two selectors, or inside one.
 *
 * @typedef {object} SelectorComment
 * @property {number} start
 * @property {number} end
 * @property {CSSToken} token
 * @property {boolean} structuralWhitespace
 */

/**
 * One selector of a list: its text positions, its token indices and its comments.
 *
 * @typedef {object} SelectorPart
 * @property {number} start
 * @property {number} end
 * @property {number} from the index of its first token
 * @property {number} to the index after its last token
 * @property {SelectorComment[]} comments
 */

/**
 * A selector kept after deduplication, with the comment tokens of its duplicates.
 *
 * @typedef {object} UniquePart
 * @property {SelectorPart} part
 * @property {CSSToken[]} comments
 */

/**
 * @param {string} selectors
 * @param {readonly CSSToken[]} tokens the tokens of `selectors`
 * @return {SelectorPart[]}
 */
function splitSelectors(selectors, tokens) {
  /** @type {SelectorPart[]} */
  const parts = [];
  let start = 0;
  let from = 0;
  let depth = 0;
  /** @type {SelectorComment[]} */
  let comments = [];

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const [type, , tokenStart, tokenEnd] = token;

    if (type === TokenType.Comment) {
      comments.push({
        start: tokenStart,
        end: tokenEnd + 1,
        token,
        structuralWhitespace: commentProvidesWhitespace(tokens, index),
      });
    }

    if (type === TokenType.Comma && depth === 0) {
      parts.push({ start, end: tokenStart, from, to: index, comments });
      start = tokenEnd + 1;
      from = index + 1;
      comments = [];
      continue;
    }

    if (
      type === TokenType.Function ||
      type === TokenType.OpenParen ||
      type === TokenType.OpenSquare ||
      type === TokenType.OpenCurly
    ) {
      depth++;
    } else if (
      type === TokenType.CloseParen ||
      type === TokenType.CloseSquare ||
      type === TokenType.CloseCurly
    ) {
      depth = Math.max(0, depth - 1);
    }
  }

  parts.push({
    start,
    end: selectors.length,
    from,
    to: tokens.length,
    comments,
  });

  // PostCSS's selector parser associates trailing whitespace with the
  // preceding selector, while a trailing empty selector is discarded.
  const last = parts.at(-1);
  if (last && !selectors.slice(last.start, last.end).trim()) {
    // The parser preserves an empty selector for comment-free input, even
    // though it discards one when comments are present in the selector list.
    if (last.start !== last.end) {
      if (parts.length > 1) {
        parts[parts.length - 2].end = last.end;
        parts[parts.length - 2].to = last.to;
      }
      parts.pop();
    } else if (selectors.includes('/*')) {
      parts.pop();
    }
  }

  return parts;
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @return {boolean}
 */
function commentProvidesWhitespace(tokens, index) {
  // Comments are whitespace in selector grammar. Retain that whitespace in a
  // comparison key only when it separates two selector components.
  if (tokens[index - 1]?.[0] === TokenType.Comment) return false;

  let previous = index - 1;
  while (tokens[previous]?.[0] === TokenType.Comment) previous--;
  let next = index + 1;
  while (tokens[next]?.[0] === TokenType.Comment) next++;

  // The end of the selector text can end a component, as the end of input does.
  return (
    canEndSelectorComponent(tokens[previous]) &&
    (next >= tokens.length || canStartSelectorComponent(tokens[next]))
  );
}

/** @param {CSSToken | undefined} token @return {boolean} */
function canEndSelectorComponent(token) {
  if (!token) return false;
  if (
    [
      TokenType.Whitespace,
      TokenType.Comment,
      TokenType.Comma,
      TokenType.Function,
      TokenType.OpenParen,
      TokenType.OpenSquare,
      TokenType.OpenCurly,
      TokenType.Colon,
    ].includes(token[0])
  ) {
    return false;
  }
  return token[0] !== TokenType.Delim || !['>', '+', '~'].includes(token[1]);
}

/** @param {CSSToken | undefined} token @return {boolean} */
function canStartSelectorComponent(token) {
  if (!token) return false;
  if (
    [
      TokenType.Whitespace,
      TokenType.Comment,
      TokenType.Comma,
      TokenType.CloseParen,
      TokenType.CloseSquare,
      TokenType.CloseCurly,
    ].includes(token[0])
  ) {
    return false;
  }
  return token[0] !== TokenType.Delim || !['>', '+', '~'].includes(token[1]);
}

/**
 * @param {string} selectors
 * @param {SelectorPart} part
 * @return {string}
 */
function selectorKey(selectors, part) {
  /** @type {string[]} */
  const keyParts = [];
  let start = part.start;

  for (const comment of part.comments) {
    keyParts.push(selectors.slice(start, comment.start));
    if (comment.structuralWhitespace) keyParts.push(' ');
    start = comment.end;
  }

  keyParts.push(selectors.slice(start, part.end));
  return keyParts.join('').trim();
}

/**
 * The first selector of each key, sorted by key, with the comments of the
 * duplicates that follow it.
 *
 * @param {string} selectors
 * @param {readonly SelectorPart[]} parts
 * @return {UniquePart[]}
 */
function uniqueParts(selectors, parts) {
  /** @type {Map<string, UniquePart>} */
  const uniqueSelectors = new Map();

  for (const part of parts) {
    const key = selectorKey(selectors, part);
    const selector = uniqueSelectors.get(key);
    if (selector === undefined) {
      uniqueSelectors.set(key, { part, comments: [] });
    } else {
      // Comments on duplicate selectors are concatenated to the first selector.
      for (const comment of part.comments)
        selector.comments.push(comment.token);
    }
  }

  return [...uniqueSelectors.entries()]
    .toSorted(([a], [b]) => {
      if (a > b) {
        return 1;
      } else {
        return a < b ? -1 : 0;
      }
    })
    .map(([, selector]) => selector);
}

/**
 * The text of the unique selectors, joined by commas.
 *
 * @param {string} selectors
 * @param {readonly UniquePart[]} unique
 * @return {string}
 */
function uniqueSelectorsText(selectors, unique) {
  let text = '';
  for (const [index, { part, comments }] of unique.entries()) {
    if (index > 0) text += ',';
    text += selectors.slice(part.start, part.end);
    for (const token of comments) text += token[1];
  }
  return text;
}

/**
 * The tokens of the unique selectors, joined by commas and renumbered.
 *
 * @param {readonly CSSToken[]} list the tokens of the selector as written
 * @param {readonly UniquePart[]} unique
 * @return {CSSToken[]}
 */
function uniqueSelectorsTokens(list, unique) {
  /** @type {CSSToken[]} */
  const joined = [];
  for (const [index, { part, comments }] of unique.entries()) {
    if (index > 0) joined.push(comma());
    for (let i = part.from; i < part.to; i++) joined.push(list[i]);
    for (const token of comments) joined.push(token);
  }
  renumber(joined);
  return joined;
}

/**
 * Removes the duplicate selectors of one rule, keeping its raw formatting.
 * The tokens of the selector come from `table`, so a list that a stage wrote
 * is not tokenized again.
 *
 * @param {import('postcss').Rule} rule
 * @param {TextTable} table
 * @return {void}
 */
export function uniqueRuleSelector(rule, table) {
  const selectors = sourceSelector(rule);
  // No comma means a single selector; nothing to dedupe or sort.
  if (!selectors.includes(',')) return;

  const list = table.tokens(rule);
  const unique = uniqueParts(selectors, splitSelectors(selectors, list));
  if (uniqueSelectorsText(selectors, unique) === selectors) return;
  table.write(rule, uniqueSelectorsTokens(list, unique));
}

/**
 * Visits one node of a walk; only rules have selectors to dedupe.
 *
 * @param {import('postcss').AnyNode} node
 * @param {TextTable} table
 * @return {void}
 */
export function uniqueSelectorsVisit(node, table) {
  if (node.type === 'rule') uniqueRuleSelector(node, table);
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-unique-selectors',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const table = new TextTable();
      css.walkRules((rule) => uniqueRuleSelector(rule, table));
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
