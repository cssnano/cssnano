/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * The index of a token list, which is the id of a selector whose tokens it
 * holds.
 *
 * @typedef {number & {readonly brand: unique symbol}} TokenListId
 */

/**
 * The token lists of one run, each at its index. A selector's id is the index
 * of the list that spells it, so a list is found by its id. Lists are only
 * appended: a list, or a token in one, is never edited once pushed, since many
 * rules share it.
 */
export class TokenLists {
  /** @type {(readonly CSSToken[])[]} */
  #lists = [];

  /** @return {number} the number of lists pushed so far */
  get length() {
    return this.#lists.length;
  }

  /**
   * @param {readonly CSSToken[]} tokens the tokens of one selector item
   * @return {TokenListId} the index of the list
   */
  push(tokens) {
    return /** @type {TokenListId} */ (this.#lists.push(tokens) - 1);
  }

  /**
   * @param {TokenListId} index an index that `push` returned
   * @return {readonly CSSToken[]}
   */
  get(index) {
    return this.#lists[index];
  }
}
