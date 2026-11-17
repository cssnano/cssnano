/** @import {TokenListId} from './tokenLists.js' */
import cssnanoUtils from '#utils';
import { isVendorExtension } from './pseudoSupport.js';

const { asciiLowerCase, TokenType } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * Index of the first token of the subject: the compound after the last
 * combinator outside any parentheses or brackets, within `[start, end)`.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {number}
 */
function subjectStart(tokens, start, end) {
  let first = start;
  let depth = 0;
  for (let i = start; i < end; i++) {
    const [type, text] = tokens[i];
    if (
      type === TokenType.OpenParen ||
      type === TokenType.OpenSquare ||
      type === TokenType.Function
    ) {
      depth++;
    } else if (
      type === TokenType.CloseParen ||
      type === TokenType.CloseSquare
    ) {
      depth--;
    } else if (
      depth === 0 &&
      (type === TokenType.Whitespace ||
        (type === TokenType.Delim &&
          (text === '>' || text === '+' || text === '~')))
    ) {
      first = i + 1;
    }
  }
  return first;
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} end the end of the selector's tokens
 * @param {number} i
 * @return {CSSToken[0] | undefined} the type of token `i`, or undefined past the end
 */
function typeAt(tokens, end, i) {
  return i < end ? tokens[i][0] : undefined;
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} end
 * @param {number} i
 * @param {string} text
 * @return {boolean}
 */
function isDelim(tokens, end, i, text) {
  return typeAt(tokens, end, i) === TokenType.Delim && tokens[i][1] === text;
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} end
 * @param {number} i
 * @return {boolean} whether token `i` is an identifier without escapes
 */
function isIdent(tokens, end, i) {
  return (
    typeAt(tokens, end, i) === TokenType.Ident && !tokens[i][1].includes('\\')
  );
}

/**
 * The key of the selector whose tokens are `[start, end)` of `tokens`, or
 * null when a type name cannot describe its element.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {string | null}
 */
function keyOfTokens(tokens, start, end) {
  let i = subjectStart(tokens, start, end);
  // A namespace prefix: `ns|`, `*|` or `|`.
  if (isDelim(tokens, end, i, '|')) {
    i++;
  } else if (
    (isIdent(tokens, end, i) || isDelim(tokens, end, i, '*')) &&
    isDelim(tokens, end, i + 1, '|')
  ) {
    i += 2;
  }
  if (!isIdent(tokens, end, i)) return null;
  const name = tokens[i][1];
  i++;
  let pseudo = '';
  if (
    typeAt(tokens, end, i) === TokenType.Colon &&
    typeAt(tokens, end, i + 1) === TokenType.Colon
  ) {
    if (!isIdent(tokens, end, i + 2)) return null;
    const pseudoName = asciiLowerCase(tokens[i + 2][1]);
    // Browsers alias a vendor-prefixed pseudo-element to a standard one, such
    // as ::-moz-placeholder to ::placeholder, so its name has no key of its own.
    if (isVendorExtension(pseudoName)) return null;
    pseudo = `::${pseudoName}`;
    i += 3;
  }
  return i === end ? asciiLowerCase(name) + pseudo : null;
}

/**
 * The key of one selector, as `RuleRecord#elementKeys` lists it, or null when a
 * type name cannot describe its element, as with classes, pseudo-classes and
 * escapes. Two different names cannot match one element.
 *
 * @param {readonly CSSToken[]} tokens the tokens of one selector item
 * @return {string | null}
 */
export function elementKeyOf(tokens) {
  return keyOfTokens(tokens, 0, tokens.length);
}

/**
 * The distinct element keys of a selector list, in order of first appearance,
 * with the same keys as a set for membership tests.
 *
 * @typedef {object} RuleElementKeys
 * @property {string[]} list
 * @property {Set<string>} seen
 */
