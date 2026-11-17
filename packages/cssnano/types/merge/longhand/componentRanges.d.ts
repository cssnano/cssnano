import type { CSSToken } from '@csstools/css-tokenizer';
export type ValueComponent = {
    raw: string;
    list: readonly CSSToken[] | undefined;
    start: number;
    end: number;
};
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/**
 * A top-level component of a value: the text it spells, and the range of the
 * value's token list that spells it, `end` exclusive. The list is undefined for
 * a component with no `(`, which has no function to type. With a list, the
 * component is a `RangePiece`, so a writer joins it without a copy.
 *
 * @typedef {{
 *   raw: string,
 *   list: readonly CSSToken[] | undefined,
 *   start: number,
 *   end: number,
 * }} ValueComponent
 */
/**
 * The token ranges of a value's top-level components: whitespace outside
 * parentheses separates them, and a `)` never opens a negative depth.
 *
 * @param {readonly CSSToken[]} tokens
 * @return {number[]} the start and end token index of each component,
 * flattened
 */
export declare function componentRanges(tokens: readonly CSSToken[]): number[];
/**
 * The tokens a value spells: the list the caller has, or one tokenization of a
 * value with a `(`. A value without one has no function, so it needs none.
 *
 * @param {string} value
 * @param {readonly CSSToken[]} [tokens]
 * @return {readonly CSSToken[] | undefined}
 */
export declare function valueTokens(value: string, tokens?: readonly CSSToken[]): readonly CSSToken[] | undefined;
/**
 * The component ranges of a token list, shared by every reader that walks
 * components by range.
 *
 * @param {readonly CSSToken[] | undefined} spelled the value's tokens, from
 * `valueTokens`
 * @return {number[] | undefined} the flattened ranges, or undefined when the
 * value has no list
 */
export declare function tokenComponentRanges(spelled: readonly CSSToken[] | undefined): number[] | undefined;
/**
 * The text a range of a value's tokens spells.
 *
 * @param {string} value
 * @param {readonly CSSToken[]} spelled the tokens of `value`
 * @param {number} start
 * @param {number} end exclusive
 * @return {string}
 */
export declare function rangeText(value: string, spelled: readonly CSSToken[], start: number, end: number): string;
/**
 * The top-level components of a value, split at whitespace outside parentheses.
 * A value with a `(` is tokenized once when the caller has no list for it; a
 * value without one has no function to type and needs none.
 *
 * @param {string} value
 * @param {readonly CSSToken[]} [tokens] the tokens `value` spells
 * @return {ValueComponent[]}
 */
export declare function splitComponents(value: string, tokens?: readonly CSSToken[]): ValueComponent[];
/**
 * The tokens of a declaration's value, when the value has a `(` to type; a
 * value without one needs none.
 *
 * @param {import('./blockDeclarations.js').DeclarationItem} decl
 * @return {readonly CSSToken[] | undefined}
 */
export declare function declarationTokens(decl: import('./blockDeclarations.js').DeclarationItem): readonly CSSToken[] | undefined;
/**
 * The texts of a declaration's top-level components, from its stored tokens
 * when the value has a function, so nothing is tokenized again.
 *
 * @param {import('./blockDeclarations.js').DeclarationItem} decl
 * @return {string[]}
 */
export declare function componentTexts(decl: import('./blockDeclarations.js').DeclarationItem): string[];
/**
 * A text as one component over its own tokens, which are read only when the
 * text has a `(`.
 *
 * @param {string} text
 * @return {ValueComponent}
 */
export declare function wholeText(text: string): ValueComponent;
//# sourceMappingURL=componentRanges.d.ts.map