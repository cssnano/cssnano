import { renumber } from '../values/renumber.js';
import cssnanoUtils from '#utils';
import { selectorItemRangesOf, textBetween } from './selectorItems.js';

const { TokenType } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TokenLists, TokenListId} from './tokenLists.js' */

/**
 * The selectors of one build, each with the id that its text gives on first
 * use. Two selectors have the same id exactly when their text is equal, so
 * comparing lists of selectors compares integers. An id is the index of the
 * token list that spells the selector, so the list is found by its id.
 */
export class SelectorIds {
  /** @type {Map<string, TokenListId>} */
  #ids = new Map();

  /**
   * @param {TokenLists} tokenLists the run's lists, which take the tokens of a selector new to the build
   * @param {string} selector
   * @param {readonly CSSToken[]} tokens the tokens of `selector`
   * @return {TokenListId} the id of the selector, given at its first use
   */
  idOf(tokenLists, selector, tokens) {
    let id = this.#ids.get(selector);
    if (id === undefined) {
      id = tokenLists.push(tokens);
      this.#ids.set(selector, id);
    }
    return id;
  }

  /**
   * The ids of the items of a selector list, each item taken as a range of the
   * list's tokens, so no item is tokenized. An item new to the build gets its
   * own renumbered copy of those tokens.
   *
   * @param {TokenLists} tokenLists
   * @param {readonly CSSToken[]} tokens the tokens of the selector list, as written
   * @return {TokenListId[]} the id of each item, in the order of the items
   */
  idsOfList(tokenLists, tokens) {
    const ranges = selectorItemRangesOf(tokens);
    /** @type {TokenListId[]} */
    const ids = [];
    for (let index = 0; index < ranges.length; index += 2) {
      const first = ranges[index];
      const last = ranges[index + 1];
      const text = textBetween(tokens, first, last);
      // An item ending in an invalid escape (a backslash before whitespace) is
      // not the valid escape the same text makes alone, so it needs its own id.
      // A trimmed item never ends in a newline, so this key collides with none.
      const key =
        first !== -1 &&
        tokens[last][0] === TokenType.Delim &&
        tokens[last][1] === '\\'
          ? text + '\n'
          : text;
      let id = this.#ids.get(key);
      if (id === undefined) {
        /** @type {CSSToken[]} */
        let item;
        if (first === -1) item = [];
        // A list that is one item keeps its own tokens, which already have their positions.
        else if (first === 0 && last === tokens.length - 1)
          item = /** @type {CSSToken[]} */ (tokens);
        else {
          item = tokens.slice(first, last + 1);
          renumber(item);
        }
        id = tokenLists.push(item);
        this.#ids.set(key, id);
      }
      ids.push(id);
    }
    return ids;
  }
}
