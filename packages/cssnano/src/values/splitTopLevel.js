import cssnanoUtils from '#utils';

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
  let depth = 0;
  let first = -1;
  let last = -1;
  const flush = () => {
    if (first !== -1) {
      components.push(
        text.slice(tokenStart(tokens[first]), tokenEnd(tokens[last]))
      );
    }
    first = -1;
  };
  for (let index = 0; index < tokens.length; index++) {
    const type = tokens[index][0];
    if (depth === 0 && type === separator) {
      flush();
      continue;
    }
    if (type === TokenType.Function || type === TokenType.OpenParen) depth++;
    else if (type === TokenType.CloseParen && depth > 0) depth--;
    if (type === TokenType.Whitespace || type === TokenType.EOF) continue;
    if (first === -1) first = index;
    last = index;
  }
  flush();
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
