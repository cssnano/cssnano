import { tokens as tokenize } from '../../utils/value.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TokenLists, TokenListId} from './tokenLists.js' */
/** @import {TokenizeMode} from '../../values/valueBuffer.js' */

/**
 * The values of one run, each with the id that its text and tokenizer mode give
 * on first use. Two values have the same id exactly when their texts are equal
 * in the same mode, so comparing declarations compares integers. The table
 * lives for the run, since a value a rewrite writes must share the id of an
 * author-written value of the same text.
 */
export class ValueIds {
  /** @type {Map<string, TokenListId>} the values tokenized in the default mode */
  #defaults = new Map();
  /** @type {Map<string, TokenListId>} the values tokenized in another mode */
  #others = new Map();

  /**
   * @param {TokenLists} tokenLists the run's lists, which take the tokens of a value new to the run
   * @param {TokenizeMode | undefined} mode the tokenizer mode of the value's property
   * @param {string} text the value's text
   * @param {readonly CSSToken[] | undefined} [tokens] the tokens
   * of the text, when the caller has them; the text is tokenized otherwise
   * @return {TokenListId} the id of the value, given at its first use
   */
  idOf(tokenLists, mode, text, tokens) {
    const ids = mode === undefined ? this.#defaults : this.#others;
    let id = ids.get(text);
    if (id === undefined) {
      id = tokenLists.push(tokens ?? tokenize(text, mode));
      ids.set(text, id);
    }
    return id;
  }
}
