/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TokenEdit} from './valueBuffer.js' */

/**
 * A new token list with each edit's range replaced, O(n + m) for n tokens and
 * m replacement tokens. Indexes refer to the list before the call, and the
 * edits are in ascending order without overlap.
 *
 * @param {readonly CSSToken[]} list
 * @param {readonly TokenEdit[]} edits
 * @return {CSSToken[]}
 */
function spliceRanges(list, edits) {
  /** @type {CSSToken[]} */
  const next = [];
  let cursor = 0;
  for (const edit of edits) {
    for (let index = cursor; index < edit.start; index++) {
      next.push(list[index]);
    }
    for (const token of edit.tokens) next.push(token);
    cursor = edit.end;
  }
  for (let index = cursor; index < list.length; index++) {
    next.push(list[index]);
  }
  return next;
}

export { spliceRanges };
