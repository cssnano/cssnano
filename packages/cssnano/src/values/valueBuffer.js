import { balancedStructure, tokens } from '../utils/value.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @typedef {NonNullable<ReturnType<typeof balancedStructure>>} BalancedTokens */

/**
 * @typedef {{unicodeRangesAllowed?: boolean}} TokenizeMode
 * @typedef {{start: number, end: number, tokens: readonly CSSToken[]}} TokenEdit
 */

/**
 * Gives each token the positions it has in the text the list spells, so a
 * reader that slices the text by token positions sees the edit. A token whose
 * positions already match is kept as it is.
 *
 * @param {CSSToken[]} list
 */
function renumber(list) {
  let start = 0;
  for (let index = 0; index < list.length; index++) {
    const token = list[index];
    const end = start + token[1].length - 1;
    if (token[2] !== start || token[3] !== end) {
      list[index] = /** @type {CSSToken} */ ([
        token[0],
        token[1],
        start,
        end,
        token[4],
      ]);
    }
    start = end + 1;
  }
}

/**
 * The working copy of one fold over a declaration value. Reads come from the
 * source text until the first edit. Tokens are built on first use, and an edit
 * builds a new list, so a list a reader holds never changes. After an edit,
 * each token's positions are its offsets in text().
 */
class ValueBuffer {
  /**
   * The current text: the source until the first edit. Undefined after a
   * token edit until text() needs it.
   * @type {string | undefined}
   */
  #text;
  /**
   * The current tokens: the shared list, else a list built on the first call
   * to tokens() or after an edit. Never mutated.
   * @type {readonly CSSToken[] | undefined}
   */
  #tokens;
  /** @type {BalancedTokens | undefined} */
  #structure;
  #structureFresh = false;
  /** @type {{message: string, plugin: string | undefined}[] | undefined} */
  #warnings;
  /** @type {TokenizeMode | undefined} */
  #mode;
  #edited = false;

  /**
   * @param {string} source the value as the stylesheet reads it
   * @param {TokenizeMode} [mode] how the tokenizer reads the value, such as
   *   with `U+` ranges for `unicode-range`
   * @param {readonly CSSToken[]} [shared] tokens that already spell `source`,
   *   so tokens() returns them without tokenizing until the first edit
   */
  constructor(source, mode, shared) {
    this.#text = source;
    this.#mode = mode;
    this.#tokens = shared;
  }

  /**
   * The current text. Before any edit this is the source text.
   *
   * @return {string}
   */
  text() {
    this.#text ??= (this.#tokens ?? []).map((token) => token[1]).join('');
    return this.#text;
  }

  /**
   * The current tokens. The list is never mutated, so a reader may keep it
   * across later edits.
   *
   * @return {readonly CSSToken[]}
   */
  tokens() {
    return (this.#tokens ??= tokens(this.text(), this.#mode));
  }

  /**
   * Whether an edit has changed the buffer. Until then, the source text is
   * the text, so a reader may check it without serializing the tokens.
   *
   * @return {boolean}
   */
  isEdited() {
    return this.#edited;
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
   * tokens. Indexes refer to the tokens as they are now. Each call costs O(n),
   * so a reducer with several edits uses replaceRanges.
   *
   * @param {number} start
   * @param {number} end
   * @param {readonly CSSToken[]} replacement built with the token constructors
   */
  replace(start, end, replacement) {
    this.replaceRanges([{ start, end, tokens: replacement }]);
  }

  /**
   * Applies several edits in one pass, O(n + m) for n tokens and m replacement
   * tokens. The result is the same as replace called from last to first. Each
   * edit's indexes refer to the tokens before the call, and the edits are in
   * ascending order without overlap.
   *
   * @param {readonly TokenEdit[]} edits
   */
  replaceRanges(edits) {
    if (edits.length === 0) return;
    const own = this.tokens();
    /** @type {CSSToken[]} */
    const next = [];
    let cursor = 0;
    for (const edit of edits) {
      for (let index = cursor; index < edit.start; index++) {
        next.push(own[index]);
      }
      for (const token of edit.tokens) next.push(token);
      cursor = edit.end;
    }
    for (let index = cursor; index < own.length; index++) {
      next.push(own[index]);
    }
    renumber(next);
    this.#tokens = next;
    this.#text = undefined;
    this.#structureFresh = false;
    this.#edited = true;
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
}

export { ValueBuffer };
