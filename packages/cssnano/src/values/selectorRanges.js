import { TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

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
