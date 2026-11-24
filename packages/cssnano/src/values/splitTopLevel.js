import cssnanoUtils from '#utils';
import {
  contentEnd,
  contentStart,
  topLevelSeparatorAt,
} from './topLevelSeparator.js';

const { TokenType, tokenEnd, tokenStart, tokens: tokenizeValue } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */

// Text with none of these has no string, escape, comment or function to hide a
// separator, so splitting at the separator character gives the same components.
const needsTokens = /\(|"|'|\\|\/\*/v;
const whitespaceRun = /[ \t\n\r\f]+/v;

/**
 * Splits a value at the tokens of one type that stand outside every pair of
 * parentheses, so a separator inside a string, a comment, an escape or a
 * function stays in its component. A component spans from its first to its
 * last token that is not whitespace; empty components are dropped.
 *
 * @param {string} text
 * @param {CSSToken[0]} separator the token type that separates components
 * @return {string[]}
 */
function splitAtTopLevel(text, separator) {
  if (!needsTokens.test(text)) return splitPlain(text, separator);
  const tokens = tokenizeValue(text);
  /** @type {string[]} */
  const components = [];
  for (let start = 0; start < tokens.length;) {
    const end = topLevelSeparatorAt(tokens, start, separator);
    const first = contentStart(tokens, start, end);
    const stop = contentEnd(tokens, first, end);
    if (first !== stop) {
      components.push(
        text.slice(tokenStart(tokens[first]), tokenEnd(tokens[stop - 1]))
      );
    }
    start = end + 1;
  }
  return components;
}

/**
 * @param {string} text text that needs no tokenizing
 * @param {CSSToken[0]} separator
 * @return {string[]}
 */
function splitPlain(text, separator) {
  const parts =
    separator === TokenType.Whitespace
      ? text.split(whitespaceRun)
      : text.split(',').map((part) => part.trim());
  return parts.filter((part) => part !== '');
}

/**
 * The top-level components of a value, which whitespace separates.
 *
 * @param {string} text
 * @return {string[]}
 */
export function splitSpace(text) {
  return splitAtTopLevel(text, TokenType.Whitespace);
}

/**
 * The top-level comma-separated parts of a value, trimmed.
 *
 * @param {string} text
 * @return {string[]}
 */
export function splitComma(text) {
  return splitAtTopLevel(text, TokenType.Comma);
}
