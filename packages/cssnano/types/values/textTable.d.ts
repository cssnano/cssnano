import type { CSSToken } from '@csstools/css-tokenizer';
import type { Rule } from 'postcss';
export type TextEntry = {
    /**
     * the text the list spells
     */
    text: string;
    tokens: readonly CSSToken[];
};
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
declare class TextTable {
    #private;
    /**
     * The tokens of the selector as written. Lists are shared, so readers must
     * not change them.
     *
     * @param {Rule} rule
     * @return {readonly CSSToken[]}
     */
    tokens(rule: Rule): readonly CSSToken[];
    /**
     * Assigns the text of a list the caller built, and stores the list itself.
     *
     * @param {Rule} rule
     * @param {readonly CSSToken[]} list positioned as the text it spells
     */
    write(rule: Rule, list: readonly CSSToken[]): void;
    /**
     * Assigns the text without storing tokens, for a text no list spells yet.
     *
     * @param {Rule} rule
     * @param {string} text
     */
    setText(rule: Rule, text: string): void;
    /**
     * Stores a list whose text the caller knows. The rule is assigned only when
     * it does not already spell the text.
     *
     * @param {Rule} rule
     * @param {string} text
     * @param {readonly CSSToken[]} list
     */
    record(rule: Rule, text: string, list: readonly CSSToken[]): void;
}
export { TextTable };
//# sourceMappingURL=textTable.d.ts.map