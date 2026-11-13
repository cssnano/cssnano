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
  /**
   * The length of the text each list spells, summed once when it is pushed, so
   * a join reads a length in constant time.
   *
   * @type {number[]}
   */
  #textLengths = [];
  /**
   * Whether the text each list spells holds `/*`, summed once when it is
   * pushed, so a reader asks the text's question without joining the text.
   *
   * @type {boolean[]}
   */
  #commentStarts = [];

  /** @return {number} the number of lists pushed so far */
  get length() {
    return this.#lists.length;
  }

  /**
   * @param {readonly CSSToken[]} tokens the tokens of one selector item
   * @return {TokenListId} the index of the list
   */
  push(tokens) {
    let length = 0;
    let commentStart = false;
    // The last character of the text so far, since `/*` can span two tokens.
    let last = '';
    for (const token of tokens) {
      const text = token[1];
      length += text.length;
      if (text.length === 0) continue;
      if (text.includes('/*') || (last === '/' && text[0] === '*')) {
        commentStart = true;
      }
      last = text[text.length - 1];
    }
    this.#textLengths.push(length);
    this.#commentStarts.push(commentStart);
    return /** @type {TokenListId} */ (this.#lists.push(tokens) - 1);
  }

  /**
   * @param {TokenListId} index an index that `push` returned
   * @return {number} the length of the text the list spells
   */
  textLength(index) {
    return this.#textLengths[index];
  }

  /**
   * @param {TokenListId} index an index that `push` returned
   * @return {boolean} whether the text the list spells holds `/*`
   */
  holdsCommentStart(index) {
    return this.#commentStarts[index];
  }

  /**
   * @param {TokenListId} index an index that `push` returned
   * @return {readonly CSSToken[]}
   */
  get(index) {
    return this.#lists[index];
  }
}
