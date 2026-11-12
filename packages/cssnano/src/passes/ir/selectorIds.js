import { tokens as tokenize } from '../../utils/value.js';

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
   * @return {TokenListId} the id of the selector, given at its first use
   */
  idOf(tokenLists, selector) {
    let id = this.#ids.get(selector);
    if (id === undefined) {
      id = tokenLists.push(tokenize(selector));
      this.#ids.set(selector, id);
    }
    return id;
  }
}
