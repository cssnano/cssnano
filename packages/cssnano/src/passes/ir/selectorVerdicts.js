/** @import {TokenListId, TokenLists} from './tokenLists.js' */
import { isInvalidSelector } from '#postcss-minify-selectors';
import { tokensText } from '../../values/tokensText.js';

/**
 * The parser's verdict on each selector that a merge asks about. The verdict
 * depends only on the selector's tokens, so it is parsed once per interned id
 * and kept for the run. Only `isValid` writes the table.
 */
export class SelectorVerdicts {
  /** @type {Map<TokenListId, boolean>} */
  #valid = new Map();

  /**
   * Whether the selector parser accepts the selector, which a browser would
   * otherwise drop along with the list it is part of.
   *
   * @param {TokenLists} tokenLists the run's lists, which spell the selector
   * @param {TokenListId} id the id of the selector
   * @return {boolean}
   */
  isValid(tokenLists, id) {
    let valid = this.#valid.get(id);
    if (valid === undefined) {
      const tokens = tokenLists.get(id);
      valid = !isInvalidSelector(tokensText(tokens), tokens, 0, tokens.length);
      this.#valid.set(id, valid);
    }
    return valid;
  }
}
