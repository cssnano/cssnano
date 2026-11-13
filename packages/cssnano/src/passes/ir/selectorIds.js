import { tokens as tokenize } from '../../utils/value.js';

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
   * @param {readonly CSSToken[]} [tokens] the tokens of `selector`, when the caller holds them
   * @return {TokenListId} the id of the selector, given at its first use
   */
  idOf(tokenLists, selector, tokens) {
    let id = this.#ids.get(selector);
    if (id === undefined) {
      id = tokenLists.push(tokens ?? tokenize(selector));
      this.#ids.set(selector, id);
    }
    return id;
  }
}
