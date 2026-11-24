import cssnanoUtils from '#utils';
import {
  contentEnd,
  contentStart,
  topLevelSeparatorAt,
} from '../values/topLevelSeparator.js';

const { TokenType } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * The text of the tokens from `first` to `last`, both inclusive.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} first the index of the first token, or -1 for no token
 * @param {number} last
 * @return {string}
 */
export function textBetween(tokens, first, last) {
  if (first === -1) return '';
  let text = '';
  for (let index = first; index <= last; index++) text += tokens[index][1];
  return text;
}

/**
 * The items of a selector: its tokens split at the comma tokens outside every
 * parenthesis, each item trimmed of whitespace. A comment is one token, so a
 * comma inside it does not split. Empty items are kept, as PostCSS keeps them.
 *
 * @param {readonly CSSToken[]} tokens the selector's tokens, as written
 * @return {string[]}
 */
export function selectorItemsOf(tokens) {
  /** @type {string[]} */
  const items = [];
  for (let start = 0; start <= tokens.length;) {
    const end = topLevelSeparatorAt(tokens, start, TokenType.Comma);
    const first = contentStart(tokens, start, end);
    const stop = contentEnd(tokens, first, end);
    items.push(first === stop ? '' : textBetween(tokens, first, stop - 1));
    start = end + 1;
  }
  return items;
}

/**
 * The items of a selector as token ranges, split as selectorItemsOf splits
 * them, so an item's text is `textBetween` of its range.
 *
 * @param {readonly CSSToken[]} tokens the selector's tokens, as written
 * @return {number[]} the first and last token index of each item, in pairs; -1 twice for an empty item
 */
export function selectorItemRangesOf(tokens) {
  /** @type {number[]} */
  const ranges = [];
  for (let start = 0; start <= tokens.length;) {
    const end = topLevelSeparatorAt(tokens, start, TokenType.Comma);
    const first = contentStart(tokens, start, end);
    const stop = contentEnd(tokens, first, end);
    if (first === stop) ranges.push(-1, -1);
    else ranges.push(first, stop - 1);
    start = end + 1;
  }
  return ranges;
}
