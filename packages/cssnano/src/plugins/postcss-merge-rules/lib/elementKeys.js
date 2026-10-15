import cssnanoUtils from '#utils';
import { simpleSelectorRe } from './ensureCompatibility.js';
import { isVendorExtension } from './pseudoSupport.js';

const { asciiLowerCase, TokenType, tokens: tokenizeCss } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */

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
 * combinator outside any parentheses or brackets.
 *
 * @param {CSSToken[]} tokens
 * @return {number}
 */
function subjectStart(tokens) {
  let start = 0;
  let depth = 0;
  for (const [i, [type, text]] of tokens.entries()) {
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
      start = i + 1;
    }
  }
  return start;
}

/**
 * The key of one selector, as `RuleMeta#elementKeys` lists it, or null when a
 * type name cannot describe its element, as with classes, pseudo-classes and
 * escapes. Two different names cannot match one element.
 *
 * @param {string} selector
 * @return {string | null}
 */
export function elementKeyOf(selector) {
  // Most selectors are type, class and id compounds joined by spaces, whose
  // subject is plain text, so they need no tokens.
  if (simpleSelectorRe.test(selector)) {
    const subject = selector.slice(selector.lastIndexOf(' ') + 1);
    return subject.includes('.') || subject.includes('#')
      ? null
      : asciiLowerCase(subject);
  }
  const tokens = tokenize(selector);
  const isDelim = (/** @type {number} */ i, /** @type {string} */ text) =>
    tokens[i]?.[0] === TokenType.Delim && tokens[i][1] === text;
  const isIdent = (/** @type {number} */ i) =>
    tokens[i]?.[0] === TokenType.Ident && !tokens[i][1].includes('\\');

  let i = subjectStart(tokens);
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
  if (
    tokens[i]?.[0] === TokenType.Colon &&
    tokens[i + 1]?.[0] === TokenType.Colon
  ) {
    if (!isIdent(i + 2)) return null;
    const pseudoName = asciiLowerCase(tokens[i + 2][1]);
    // Browsers alias a vendor-prefixed pseudo-element to a standard one, such
    // as ::-moz-placeholder to ::placeholder, so its name has no key of its own.
    if (isVendorExtension(pseudoName)) return null;
    pseudo = `::${pseudoName}`;
    i += 3;
  }
  return i === tokens.length ? asciiLowerCase(name) + pseudo : null;
}

/**
 * A memoized `elementKeyOf`, so each distinct selector is tokenized once per
 * stylesheet, however many times its rule is described again.
 *
 * @param {Map<string, string | null>} [cache]
 * @return {(selector: string) => string | null}
 */
export function createElementKeyLookup(cache = new Map()) {
  return (selector) => {
    let key = cache.get(selector);
    if (key === undefined) {
      key = elementKeyOf(selector);
      cache.set(selector, key);
    }
    return key;
  };
}
