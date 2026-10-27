import { tokens as tokenize } from '../utils/value.js';
import { sourceSelector, sourceValue } from '../utils/sourceText.js';
import { tokensText } from './tokensText.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Declaration, Rule} from 'postcss' */

/**
 * @typedef {object} TextEntry
 * @property {string} text the text the list spells
 * @property {readonly CSSToken[]} tokens
 */

/**
 * A folded text: its text, and the tokens that spell it when a stage read
 * them.
 * @typedef {TextEntry | {text: string, tokens: undefined}} FoldedText
 */

/** @typedef {Rule | Declaration} TextNode */

/**
 * Gives each rule's selector and each declaration's value one token list, so
 * a stage that reads a text after another stage wrote it does not tokenize it
 * again. An entry is reused only while the node still spells its text.
 */
class TextTable {
  /** @type {WeakMap<TextNode, TextEntry>} */
  #entries = new WeakMap();

  /**
   * The tokens of the text as written. Lists are shared, so readers must not
   * change them.
   *
   * @param {TextNode} node
   * @return {readonly CSSToken[]}
   */
  tokens(node) {
    const text = sourceOf(node);
    const entry = this.#entries.get(node);
    if (entry !== undefined && entry.text === text) return entry.tokens;
    const list = tokenize(text);
    this.#entries.set(node, { text, tokens: list });
    return list;
  }

  /**
   * The stored tokens of the text, or undefined when none are stored for the
   * text the node spells. Unlike `tokens`, it never tokenizes.
   *
   * @param {TextNode} node
   * @return {readonly CSSToken[] | undefined}
   */
  stored(node) {
    const entry = this.#entries.get(node);
    return entry !== undefined && entry.text === sourceOf(node)
      ? entry.tokens
      : undefined;
  }

  /**
   * Assigns the text of a list the caller built, and stores the list itself.
   *
   * @param {TextNode} node
   * @param {readonly CSSToken[]} list positioned as the text it spells
   */
  write(node, list) {
    const text = tokensText(list);
    assign(node, text);
    this.#entries.set(node, { text, tokens: list });
  }

  /**
   * Assigns the text without storing tokens, for a text no list spells yet.
   *
   * @param {TextNode} node
   * @param {string} text
   */
  setText(node, text) {
    assign(node, text);
  }

  /**
   * Stores a list whose text the caller knows. The node is assigned only when
   * it does not already spell the text.
   *
   * @param {TextNode} node
   * @param {string} text
   * @param {readonly CSSToken[]} list
   */
  record(node, text, list) {
    assign(node, text);
    this.#entries.set(node, { text, tokens: list });
  }

  /**
   * Stores an entry a memo already holds, so the node and the memo share one
   * list. The node is assigned only when it does not already spell the text.
   *
   * @param {TextNode} node
   * @param {TextEntry} entry
   */
  share(node, entry) {
    assign(node, entry.text);
    this.#entries.set(node, entry);
  }

  /**
   * Gives the node a folded text. A folded text with tokens is shared as the
   * entry, so a memo and its nodes hold one list; one without is only assigned.
   *
   * @param {TextNode} node
   * @param {FoldedText} folded
   */
  assignFolded(node, folded) {
    if (folded.tokens === undefined) assign(node, folded.text);
    else this.share(node, folded);
  }
}

/**
 * The text a node is read as: its selector or value, with the comments that
 * PostCSS strips from them.
 *
 * @param {TextNode} node
 * @returns {string}
 */
function sourceOf(node) {
  return node.type === 'decl' ? sourceValue(node) : sourceSelector(node);
}

/**
 * Sets the selector or value to the text and drops the raw, which would
 * otherwise restore comments the text no longer has.
 *
 * @param {TextNode} node
 * @param {string} text
 */
function assign(node, text) {
  if (sourceOf(node) === text) return;
  if (node.type === 'decl') {
    node.value = text;
    delete node.raws.value;
  } else {
    node.selector = text;
    delete node.raws.selector;
  }
}

export { TextTable };
