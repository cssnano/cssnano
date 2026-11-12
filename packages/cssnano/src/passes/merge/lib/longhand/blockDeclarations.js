import cssnanoUtils from '#utils';
import { requiredSupport } from './isFallback.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * A declaration of one block, as the longhand reducers edit it: its text and
 * tokens, the raws a style hack or a clone reads, and what an edit did to it.
 *
 * @typedef {object} DeclarationItem
 * @property {string} prop
 * @property {string} value the text, without the comments PostCSS strips
 * @property {readonly CSSToken[]} tokens the tokens of `value`
 * @property {boolean} important
 * @property {string | undefined} before the raw text before the declaration
 * @property {string | undefined} between the raw text between prop and value
 * @property {string | undefined} importantSpelling the raw `!important`
 * @property {ReadonlySet<string> | null} inheritedSupport the support a clone
 * needed from its source, or `null` for a declaration the author wrote
 * @property {boolean} kept the value as written holds an important comment, so
 * no reducer edits the declaration
 * @property {boolean} removed
 * @property {boolean} rewritten
 * @property {number} source for a clone, the position of its source; `-1` otherwise
 */

/** The chain entry of a point where a run of declarations ends. */
export const RUN_END = -1;

/**
 * The declarations of one block in chain order, with the run ends among them.
 * The reducers read the items and make their edits through the methods, so
 * every item is addressed by its position: an authored declaration by its place
 * in the chain, a clone by the place it was pushed at.
 */
export class BlockDeclarations {
  /** @type {DeclarationItem[]} */
  #items;
  /** @type {readonly number[]} */
  #chain;

  /**
   * @param {DeclarationItem[]} items the authored declarations, in chain order
   * @param {readonly number[]} chain the positions of `items` in chain order,
   * with `RUN_END` where a run of declarations ends
   */
  constructor(items, chain) {
    this.#items = items;
    this.#chain = chain;
  }

  /**
   * @return {readonly number[]} the positions of the declarations in chain
   * order, with `RUN_END` where a run ends
   */
  get chain() {
    return this.#chain;
  }

  /** @return {number} the declarations, authored and cloned */
  get length() {
    return this.#items.length;
  }

  /**
   * @param {number} position
   * @return {DeclarationItem}
   */
  at(position) {
    return this.#items[position];
  }

  /**
   * Sets the property and the value of a declaration. Omitting the tokens
   * tokenizes the new value, unless it is the value the item already has.
   *
   * @param {number} position
   * @param {string} prop
   * @param {string} value
   * @param {readonly CSSToken[]} [tokens]
   * @return {void}
   */
  rewrite(position, prop, value, tokens) {
    const item = this.#items[position];
    item.prop = prop;
    if (tokens !== undefined) {
      item.tokens = tokens;
    } else if (value !== item.value) {
      item.tokens = cssnanoUtils.tokens(value);
    }
    item.value = value;
    item.rewritten = true;
  }

  /**
   * @param {number} position
   * @return {void}
   */
  remove(position) {
    this.#items[position].removed = true;
  }

  /**
   * Adds a declaration after the items, to be placed after its source when the
   * block is committed. It takes the source's raws and the support the source
   * required.
   *
   * @param {number} source
   * @param {{ prop: string, value: string, important: boolean }} change
   * @return {number} the position of the clone
   */
  insertClone(source, change) {
    const from = this.#items[source];
    this.#items.push({
      prop: change.prop,
      value: change.value,
      tokens: cssnanoUtils.tokens(change.value),
      important: change.important,
      before: from.before,
      between: from.between,
      importantSpelling: from.importantSpelling,
      inheritedSupport: requiredSupport(from),
      kept: false,
      removed: false,
      rewritten: true,
      source,
    });
    return this.#items.length - 1;
  }
}
