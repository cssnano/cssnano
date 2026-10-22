import { balancedStructure, tokens } from '../utils/value.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/** @typedef {NonNullable<ReturnType<typeof balancedStructure>>} BalancedTokens */

/**
 * A declaration value, as the text it was read from. Its tokens and bracket
 * structure are built on first use and then shared by every reader.
 */
class Value {
  /** @readonly */
  text;
  /** @type {readonly CSSToken[] | undefined} */
  #tokens;
  /** @type {BalancedTokens | undefined} */
  #structure;
  #structureBuilt = false;

  /** @param {string} text */
  constructor(text) {
    this.text = text;
  }

  /**
   * The tokens of the text, without the end-of-file token. The list and each
   * token are frozen, so a reader cannot change what another reader sees.
   *
   * @return {readonly CSSToken[]}
   */
  tokens() {
    if (this.#tokens === undefined) {
      const list = tokens(this.text);
      for (const token of list) Object.freeze(token);
      this.#tokens = Object.freeze(list);
    }
    return this.#tokens;
  }

  /**
   * The bracket structure of the tokens, or undefined when a bracket is
   * unclosed or closes out of order.
   *
   * @return {BalancedTokens | undefined}
   */
  structure() {
    if (!this.#structureBuilt) {
      this.#structure = balancedStructure(this.tokens());
      this.#structureBuilt = true;
    }
    return this.#structure;
  }
}

/**
 * The values of one run. Equal text gives the same Value, and no Value
 * outlives the table that interned it.
 */
class ValueTable {
  /** @type {Map<string, Value>} */
  #values = new Map();

  /**
   * @param {string} text
   * @return {Value}
   */
  intern(text) {
    let value = this.#values.get(text);
    if (value === undefined) {
      value = new Value(text);
      this.#values.set(text, value);
    }
    return value;
  }
}

export { Value, ValueTable };
