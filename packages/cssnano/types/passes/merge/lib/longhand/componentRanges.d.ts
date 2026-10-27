import type { CSSToken } from '@csstools/css-tokenizer';
export type ValueComponent = {
    text: string;
    tokens: readonly CSSToken[] | undefined;
    start: number;
    end: number;
};
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * A top-level component of a value: the text it spells, and the range of the
 * value's tokens that spell it when the value has a token list. The tokens are
 * undefined for a component with no `(`, which has no function to type.
 *
 * @typedef {{
 *   text: string,
 *   tokens: readonly CSSToken[] | undefined,
 *   start: number,
 *   end: number,
 * }} ValueComponent
 */
/**
 * The token ranges that `list.space` splits a value into: whitespace outside
 * parentheses separates components, and a `)` never opens a negative depth.
 * Tokens split where the string does except on a comment or a bad token.
 *
 * @param {readonly CSSToken[]} tokens
 * @return {number[]} the start and end token index of each component,
 * flattened
 */
export declare function componentRanges(tokens: readonly CSSToken[]): number[];
/**
 * @param {readonly CSSToken[]} tokens
 * @return {boolean} whether the tokens split where `list.space` splits the
 * string; a comment or a bad token makes it split inside a word
 */
export declare function splitsAsTokens(tokens: readonly CSSToken[]): boolean;
/**
 * The top-level components of a value, split where `list.space` splits it.
 * A value with a `(` is tokenized once when the caller has no list for it; a
 * value without one has no function to type and needs none.
 *
 * @param {string} value
 * @param {readonly CSSToken[]} [tokens] the tokens `value` spells
 * @return {ValueComponent[]}
 */
export declare function splitComponents(value: string, tokens?: readonly CSSToken[]): ValueComponent[];
/**
 * The tokens a declaration's value has in the text table, when the value has a
 * `(` to type; a value without one needs none.
 *
 * @param {import('../../../../values/textTable.js').TextTable} textTable
 * @param {import('postcss').Declaration} decl
 * @return {readonly CSSToken[] | undefined}
 */
export declare function declarationTokens(textTable: import('../../../../values/textTable.js').TextTable, decl: import('postcss').Declaration): readonly CSSToken[] | undefined;
/**
 * A text as one component over its own tokens, which are read only when the
 * text has a `(`.
 *
 * @param {string} text
 * @return {ValueComponent}
 */
export declare function wholeText(text: string): ValueComponent;
//# sourceMappingURL=componentRanges.d.ts.map