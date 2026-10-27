import type { CSSToken } from '@csstools/css-tokenizer';
import type { Declaration, Rule } from 'postcss';
export type FoldedSelector = {
    text: string;
    tokens: readonly CSSToken[] | undefined;
};
export type TextEntry = {
    /**
     * the text the list spells
     */
    text: string;
    tokens: readonly CSSToken[];
};
export type TextNode = Rule | Declaration;
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Declaration, Rule} from 'postcss' */
/**
 * A folded text: its text, and the tokens that spell it when a stage read
 * them.
 * @typedef {{text: string, tokens: readonly CSSToken[] | undefined}} FoldedSelector
 */
/**
 * @typedef {object} TextEntry
 * @property {string} text the text the list spells
 * @property {readonly CSSToken[]} tokens
 */
/** @typedef {Rule | Declaration} TextNode */
/**
 * Gives each rule's selector and each declaration's value one token list, so
 * a stage that reads a text after another stage wrote it does not tokenize it
 * again. An entry is reused only while the node still spells its text.
 */
declare class TextTable {
    #private;
    /**
     * The tokens of the text as written. Lists are shared, so readers must not
     * change them.
     *
     * @param {TextNode} node
     * @return {readonly CSSToken[]}
     */
    tokens(node: TextNode): readonly CSSToken[];
    /**
     * The stored tokens of the text, or undefined when none are stored for the
     * text the node spells. Unlike `tokens`, it never tokenizes.
     *
     * @param {TextNode} node
     * @return {readonly CSSToken[] | undefined}
     */
    stored(node: TextNode): readonly CSSToken[] | undefined;
    /**
     * Assigns the text of a list the caller built, and stores the list itself.
     *
     * @param {TextNode} node
     * @param {readonly CSSToken[]} list positioned as the text it spells
     */
    write(node: TextNode, list: readonly CSSToken[]): void;
    /**
     * Assigns the text without storing tokens, for a text no list spells yet.
     *
     * @param {TextNode} node
     * @param {string} text
     */
    setText(node: TextNode, text: string): void;
    /**
     * Stores a list whose text the caller knows. The node is assigned only when
     * it does not already spell the text.
     *
     * @param {TextNode} node
     * @param {string} text
     * @param {readonly CSSToken[]} list
     */
    record(node: TextNode, text: string, list: readonly CSSToken[]): void;
    /**
     * Stores an entry a memo already holds, so the node and the memo share one
     * list. The node is assigned only when it does not already spell the text.
     *
     * @param {TextNode} node
     * @param {TextEntry} entry
     */
    share(node: TextNode, entry: TextEntry): void;
}
export { TextTable };
//# sourceMappingURL=textTable.d.ts.map