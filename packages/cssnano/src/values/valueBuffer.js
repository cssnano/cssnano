import { balancedStructure, tokens } from '../utils/value.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @typedef {NonNullable<ReturnType<typeof balancedStructure>>} BalancedTokens */

/** Longest replacement passed to splice as spread arguments. */
const maxSpreadArguments = 10_000;

/**
 * The working copy of one fold over a declaration value. Reads come from the
 * source text until the first edit. Tokens are built on first use, and a
 * buffer owns its token list, so an edit never touches a list another reader
 * holds. finish serializes the result once.
 */
class ValueBuffer {
  /** @type {string} */
  #source;
  #edited = false;
  /**
   * The buffer's own text. Undefined after an edit until text() needs it.
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
  /** @type {{message: string, plugin: string | undefined}[] | undefined} */
  #warnings;

  /** @param {string} source the value as the stylesheet reads it */
  constructor(source) {
    this.#source = source;
  }

  /**
   * The current text. Before any edit this is the source text.
   *
   * @return {string}
   */
  text() {
    if (!this.#edited) return this.#source;
    if (this.#text === undefined) {
      this.#text = (this.#tokens ?? []).map((token) => token[1]).join('');
    }
    return this.#text;
  }

  /**
   * The current tokens. The list is the buffer's own, so readers may use it
   * but should change it only through replace.
   *
   * @return {readonly CSSToken[]}
   */
  tokens() {
    if (this.#tokens === undefined) this.#tokens = tokens(this.text());
    return this.#tokens;
  }

  /**
   * The bracket structure of the current tokens, or undefined when they are
   * unbalanced.
   *
   * @return {BalancedTokens | undefined}
   */
  structure() {
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
    const own = this.#own();
    // Spreading into splice overflows the call stack for a long replacement,
    // so the list is rebuilt from an array literal instead.
    if (replacement.length <= maxSpreadArguments) {
      own.splice(start, end - start, ...replacement);
    } else {
      this.#tokens = [
        ...own.slice(0, start),
        ...replacement,
        ...own.slice(end),
      ];
    }
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
   * Reports a problem with the value. The host turns each message into a
   * warning on the declaration, tagged with the plugin name when given.
   *
   * @param {string} message
   * @param {string} [plugin]
   */
  warn(message, plugin) {
    if (this.#warnings === undefined) this.#warnings = [];
    this.#warnings.push({ message, plugin });
  }

  /**
   * The warnings reported so far, or undefined when there are none.
   *
   * @return {readonly {message: string, plugin: string | undefined}[] | undefined}
   */
  warnings() {
    return this.#warnings;
  }

  /**
   * The serialized text of the buffer. A buffer with no edits gives its
   * source text.
   *
   * @return {string}
   */
  finish() {
    return this.text();
  }

  /**
   * Gives the buffer its own tokens, so edits can change them in place.
   *
   * @return {CSSToken[]}
   */
  #own() {
    if (this.#tokens === undefined) this.#tokens = tokens(this.text());
    this.#edited = true;
    return this.#tokens;
  }
}

export { ValueBuffer };
