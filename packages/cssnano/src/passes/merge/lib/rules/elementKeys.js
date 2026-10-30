import cssnanoUtils from '#utils';
import { simpleSelectorRe } from './ensureCompatibility.js';
import { isVendorExtension } from './pseudoSupport.js';

const { asciiLowerCase, TokenType, tokens: tokenizeCss } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */

/**
 * The tokens of a selector, without trailing whitespace.
 *
 * @param {string} selector
 * @return {CSSToken[]}
 */
function tokenize(selector) {
  const result = tokenizeCss(selector);
  while (result.length && result.at(-1)?.[0] === TokenType.Whitespace)
    result.pop();
  return result;
}

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
 * escapes. Two different names cannot match one element. A token range of
 * the selector, when given, gives the key without tokenizing its text.
 *
 * @param {string} selector
 * @param {RangePiece | null} [piece] the selector's tokens, which spell it
 * @return {string | null}
 */
export function elementKeyOf(selector, piece = null) {
  // Most selectors are type, class and id compounds joined by spaces, whose
  // subject is plain text, so they need no tokens.
  if (simpleSelectorRe.test(selector)) {
    const subject = selector.slice(selector.lastIndexOf(' ') + 1);
    return subject.includes('.') || subject.includes('#')
      ? null
      : asciiLowerCase(subject);
  }
  if (piece) return keyOfTokens(piece.list, piece.start, piece.end);
  const tokens = tokenize(selector);
  return keyOfTokens(tokens, 0, tokens.length);
}

/**
 * A memoized `elementKeyOf`, so each distinct selector is tokenized once per
 * stylesheet, however many times its rule is described again.
 *
 * @param {Map<string, string | null>} [cache]
 * @return {(selector: string, piece?: RangePiece | null) => string | null}
 */
export function createElementKeyLookup(cache = new Map()) {
  return (selector, piece) => {
    let key = cache.get(selector);
    if (key === undefined) {
      key = elementKeyOf(selector, piece);
      cache.set(selector, key);
    }
    return key;
  };
}
