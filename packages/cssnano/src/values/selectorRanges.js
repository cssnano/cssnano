import { TokenType } from '@csstools/css-tokenizer';
import { comma } from './punctuationTokens.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {RangePiece} from './joinRanges.js' */

/**
 * The token index range of one selector: `end` is exclusive.
 *
 * @typedef {{start: number, end: number}} SelectorRange
 */

/**
 * Splits a rule's selector tokens at the commas that split `rule.selectors`,
 * giving each selector the range it spells. Commas inside functions and
 * parentheses do not split, and whitespace and comments at a selector's ends
 * are not part of it. Empty selectors are kept, as PostCSS keeps them. No
 * token is copied.
 *
 * @param {readonly CSSToken[]} list
 * @return {SelectorRange[]}
 */
export function selectorRanges(list) {
  /** @type {SelectorRange[]} */ const ranges = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < list.length; index++) {
    const type = list[index][0];
    if (type === TokenType.Function || type === TokenType.OpenParen) depth++;
    else if (type === TokenType.CloseParen) {
      if (depth > 0) depth--;
    } else if (type === TokenType.Comma && depth === 0) {
      ranges.push(trimmedRange(list, start, index));
      start = index + 1;
    }
  }
  ranges.push(trimmedRange(list, start, list.length));
  return ranges;
}

/**
 * @param {readonly CSSToken[]} list
 * @param {number} start
 * @param {number} end
 * @return {SelectorRange}
 */
function trimmedRange(list, start, end) {
  let first = start;
  let last = end;
  while (first < last && isSkipped(list[first])) first++;
  while (last > first && isSkipped(list[last - 1])) last--;
  return { start: first, end: last };
}

/**
 * Whitespace and comments are not part of a selector's text at its ends.
 *
 * @param {CSSToken} token
 * @return {boolean}
 */
function isSkipped(token) {
  return token[0] === TokenType.Whitespace || token[0] === TokenType.Comment;
}

/**
 * The ranges of a rule's selectors in its tokens, each with the list it
 * indexes, or null when the ranges do not spell the selectors one for one.
 * Comments at a selector's ends are trimmed from its range, so a selector
 * that keeps one gives null.
 *
 * @param {readonly CSSToken[]} list
 * @param {readonly string[]} selectors
 * @return {RangePiece[] | null}
 */
export function selectorPieces(list, selectors) {
  const ranges = selectorRanges(list);
  if (ranges.length !== selectors.length) return null;
  /** @type {RangePiece[]} */
  const pieces = [];
  for (const [index, range] of ranges.entries()) {
    if (!spells(list, range, selectors[index])) return null;
    pieces.push({ list, start: range.start, end: range.end });
  }
  return pieces;
}

/**
 * Whether the tokens of the range spell the text, token by token, with no
 * character left over.
 *
 * @param {readonly CSSToken[]} list
 * @param {SelectorRange} range
 * @param {string} text
 * @return {boolean}
 */
function spells(list, { start, end }, text) {
  let at = 0;
  for (let index = start; index < end; index++) {
    const token = list[index][1];
    if (!text.startsWith(token, at)) return false;
    at += token.length;
  }
  return at === text.length;
}

/**
 * The tokens PostCSS joins the selectors of a list with: the first comma, and
 * the whitespace after it. A list with no comma gets a bare comma, which a
 * single selector never prints.
 *
 * @param {readonly CSSToken[]} list
 * @return {CSSToken[]}
 */
export function separatorOf(list) {
  const index = list.findIndex((token) => token[0] === TokenType.Comma);
  if (index === -1) return [comma()];
  const separator = [list[index]];
  if (list[index + 1]?.[0] === TokenType.Whitespace) {
    separator.push(list[index + 1]);
  }
  return separator;
}
