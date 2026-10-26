import { renumber } from './renumber.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {SelectorRange} from './selectorRanges.js' */

/**
 * A token range of one list, such as a selector's range in its rule's tokens.
 *
 * @typedef {SelectorRange & {list: readonly CSSToken[]}} RangePiece
 */

/**
 * Joins the pieces into one new list, with the separator between each pair.
 * The tokens are shared with their pieces, and renumbering copies only those
 * whose positions moved, so a joined list costs time in its own size.
 *
 * @param {readonly RangePiece[]} pieces
 * @param {readonly CSSToken[]} separator
 * @return {CSSToken[]}
 */
export function joinRanges(pieces, separator) {
  /** @type {CSSToken[]} */
  const joined = [];
  for (const [index, { list, start, end }] of pieces.entries()) {
    if (index > 0) for (const token of separator) joined.push(token);
    for (let i = start; i < end; i++) joined.push(list[i]);
  }
  renumber(joined);
  return joined;
}
