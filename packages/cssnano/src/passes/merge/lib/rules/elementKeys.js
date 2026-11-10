/** @import {TokenListId} from '../../../ir/tokenLists.js' */
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
 * The key of the selector whose tokens are `[start, end)` of `tokens`, or
 * null when a type name cannot describe its element.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {string | null}
 */
function keyOfTokens(tokens, start, end) {
  const typeAt = (/** @type {number} */ i) =>
    i < end ? tokens[i][0] : undefined;
  const isDelim = (/** @type {number} */ i, /** @type {string} */ text) =>
    typeAt(i) === TokenType.Delim && tokens[i][1] === text;
  const isIdent = (/** @type {number} */ i) =>
    typeAt(i) === TokenType.Ident && !tokens[i][1].includes('\\');

  let i = subjectStart(tokens, start, end);
  // A namespace prefix: `ns|`, `*|` or `|`.
  if (isDelim(i, '|')) {
    i++;
  } else if ((isIdent(i) || isDelim(i, '*')) && isDelim(i + 1, '|')) {
    i += 2;
  }
  if (!isIdent(i)) return null;
  const name = tokens[i][1];
  i++;
  let pseudo = '';
  if (typeAt(i) === TokenType.Colon && typeAt(i + 1) === TokenType.Colon) {
    if (!isIdent(i + 2)) return null;
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

/**
 * Adds the keys of the selectors from index `from` on to `keys`.
 *
 * @param {RuleElementKeys} keys
 * @param {readonly TokenListId[]} ids the id of each selector of the list
 * @param {number} from
 * @param {(id: TokenListId) => string | null} keyOf
 * @return {boolean} false when a selector has no key, so the elements are unknown
 */
export function addElementKeys(keys, ids, from, keyOf) {
  for (let index = from; index < ids.length; index++) {
    const key = keyOf(ids[index]);
    if (key === null) return false;
    if (!keys.seen.has(key)) {
      keys.seen.add(key);
      keys.list.push(key);
    }
  }
  return true;
}
