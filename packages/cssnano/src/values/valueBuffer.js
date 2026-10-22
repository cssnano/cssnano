import { balancedStructure, tokens } from '../utils/value.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Value, ValueTable} from './value.js' */
/** @typedef {NonNullable<ReturnType<typeof balancedStructure>>} BalancedTokens */

/**
 * The working copy of one fold over a Value. Reads come from the source until
 * the first edit. After it, the buffer owns a token list and edits that list
 * only; finish serializes the list once and interns the result.
 */
class ValueBuffer {
  /** @type {Value} */
  #source;
  /** @type {ValueTable} */
  #table;
  #edited = false;
  /**
   * The buffer's own text. Undefined after an edit until text() or tokens()
   * needs it.
   * @type {string | undefined}
   */
  #text;
  /**
   * The buffer's own tokens. Undefined after replaceText until tokens()
   * retokenizes.
   * @type {CSSToken[] | undefined}
   */
  #tokens;
  /** @type {BalancedTokens | undefined} */
  #structure;
  #structureFresh = false;

  /**
   * @param {Value} source
   * @param {ValueTable} table interns the Value that finish returns
   */
  constructor(source, table) {
    this.#source = source;
    this.#table = table;
  }

  /**
   * The current text. Before any edit this is the source text.
   *
   * @return {string}
   */
  text() {
    if (!this.#edited) return this.#source.text;
    if (this.#text === undefined) {
      this.#text = (this.#tokens ?? []).map((token) => token[1]).join('');
    }
    return this.#text;
  }

  /**
   * The current tokens. Before any edit these are the source's frozen tokens.
   * After an edit they are the buffer's own list, which reducers may read but
   * should change only through replace.
   *
   * @return {readonly CSSToken[]}
   */
  tokens() {
    if (!this.#edited) return this.#source.tokens();
    if (this.#tokens === undefined) this.#tokens = tokens(this.#text ?? '');
    return this.#tokens;
  }

  /**
   * The bracket structure of the current tokens, or undefined when they are
   * unbalanced.
   *
   * @return {BalancedTokens | undefined}
   */
  structure() {
    if (!this.#edited) return this.#source.structure();
    if (!this.#structureFresh) {
      this.#structure = balancedStructure(this.tokens());
      this.#structureFresh = true;
    }
    return this.#structure;
  }

  /**
   * Replaces the tokens from `start` up to `end`, exclusive, with the given
   * tokens. Indexes refer to the tokens as they are now, so a reducer with
   * several edits applies them from last to first.
   *
   * @param {number} start
   * @param {number} end
   * @param {readonly CSSToken[]} replacement built with the token constructors
   */
  replace(start, end, replacement) {
    this.#own().splice(start, end - start, ...replacement);
    this.#text = undefined;
    this.#structureFresh = false;
  }

  /**
   * Replaces the whole content with `text`. The tokens are read from it on
   * the next call to tokens().
   *
   * @param {string} text
   */
  replaceText(text) {
    this.#edited = true;
    this.#text = text;
    this.#tokens = undefined;
    this.#structureFresh = false;
  }

  /**
   * The Value of the current text. A buffer with no edits gives its source.
   *
   * @return {Value}
   */
  finish() {
    if (!this.#edited) return this.#source;
    return this.#table.intern(this.text());
  }

  /**
   * Makes the buffer own a copy of its tokens, so the source list stays frozen.
   *
   * @return {CSSToken[]}
   */
  #own() {
    if (!this.#edited) {
      this.#tokens = [...this.#source.tokens()];
      this.#edited = true;
    } else if (this.#tokens === undefined) {
      this.#tokens = tokens(this.#text ?? '');
    }
    return /** @type {CSSToken[]} */ (this.#tokens);
  }
}

export { ValueBuffer };
