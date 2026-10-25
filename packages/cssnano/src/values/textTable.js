import { tokens as tokenize } from '../utils/value.js';
import { sourceSelector } from '../pipeline/traversal.js';
import { tokensText } from './tokensText.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Rule} from 'postcss' */

/**
 * @typedef {object} TextEntry
 * @property {string} text the text the list spells
 * @property {readonly CSSToken[]} tokens
 */

/**
 * Gives each rule's selector one token list, so a stage that reads a selector
 * after another stage wrote it does not tokenize it again. An entry is reused
 * only while the rule still spells its text.
 */
class TextTable {
  /** @type {WeakMap<Rule, TextEntry>} */
  #entries = new WeakMap();

  /**
   * The tokens of the selector as written. Lists are shared, so readers must
   * not change them.
   *
   * @param {Rule} rule
   * @return {readonly CSSToken[]}
   */
  tokens(rule) {
    const text = sourceSelector(rule);
    const entry = this.#entries.get(rule);
    if (entry !== undefined && entry.text === text) return entry.tokens;
    const list = tokenize(text);
    this.#entries.set(rule, { text, tokens: list });
    return list;
  }

  /**
   * Assigns the text of a list the caller built, and stores the list itself.
   *
   * @param {Rule} rule
   * @param {readonly CSSToken[]} list positioned as the text it spells
   */
  write(rule, list) {
    const text = tokensText(list);
    assign(rule, text);
    this.#entries.set(rule, { text, tokens: list });
  }

  /**
   * Stores a list whose text the caller knows. The rule is assigned only when
   * it does not already spell the text.
   *
   * @param {Rule} rule
   * @param {string} text
   * @param {readonly CSSToken[]} list
   */
  record(rule, text, list) {
    assign(rule, text);
    this.#entries.set(rule, { text, tokens: list });
  }
}

/**
 * Sets the selector to the text and drops the raw, which would otherwise
 * restore comments the text no longer has.
 *
 * @param {Rule} rule
 * @param {string} text
 */
function assign(rule, text) {
  if (sourceSelector(rule) === text) return;
  rule.selector = text;
  delete rule.raws.selector;
}

export { TextTable };
