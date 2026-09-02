import { TokenType } from '@csstools/css-tokenizer';
export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
export type SourceEdit = {
    start: number;
    end: number;
    text: string;
    priority?: number;
};
export type IntervalNode = {
    edit: SourceEdit;
    left?: IntervalNode;
    right?: IntervalNode;
    height: number;
    maxEnd: number;
    maxPriority: number;
};
export type NumericSource = {
    index: number;
    start: number;
    end: number;
    raw: string;
    number: number;
    unit: string;
    hasDecimal: boolean;
};
/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/** @typedef {{start: number, end: number, text: string, priority?: number}} SourceEdit */
/** @typedef {{edit: SourceEdit, left?: IntervalNode, right?: IntervalNode, height: number, maxEnd: number, maxPriority: number}} IntervalNode */
/** @typedef {{index: number, start: number, end: number, raw: string, number: number, unit: string, hasDecimal: boolean}} NumericSource */
/** @param {CSSToken} token @return {string} */
declare function decoded(token: CSSToken): string;
/** @param {string} value @return {CSSToken[]} */
declare function tokens(value: string): CSSToken[];
/** @param {CSSToken} token @return {number} */
declare function tokenStart(token: CSSToken): number;
/** @param {CSSToken} token @return {number} */
declare function tokenEnd(token: CSSToken): number;
/**
 * Apply source edits. Invalid source bounds and equally prioritized overlaps
 * fail closed, preserving the complete input instead of a partial rewrite.
 *
 * @param {string} source
 * @param {SourceEdit[]} edits
 * @return {string}
 */
declare function applyEdits(source: string, edits: SourceEdit[]): string;
/** @param {CSSToken} token @return {{number: number, unit: string} | false} */
declare function numeric(token: CSSToken): {
    number: number;
    unit: string;
} | false;
/**
 * Capture one numeric source spelling, including PostCSS's historic `1.em`
 * token shape. Its `end` is a character offset exclusive of the source.
 *
 * @param {CSSToken[]} input
 * @param {number} index
 * @return {NumericSource | false}
 */
declare function numericSource(input: CSSToken[], index: number): NumericSource | false;
/**
 * Lexical CSS block index. This does not parse or validate any CSS grammar;
 * consumers must preserve raw spelling and define their own malformed-input policy.
 */
declare class BalancedTokens {
    #private;
    /** @readonly @type {readonly CSSToken[]} */
    readonly tokens: readonly CSSToken[];
    /** @param {readonly CSSToken[]} input @param {Map<number, number>} ends */
    constructor(input: readonly CSSToken[], ends: Map<number, number>);
    /** @param {number} index @return {number | undefined} */
    endForOpening(index: number): number | undefined;
    /**
     * Split a balanced token range at delimiters visible at its own lexical level.
     * Range bounds are token indexes and `endIndex` is exclusive.
     *
     * @param {number} [startIndex]
     * @param {number} [endIndex]
     * @param {TokenType} [delimiter]
     * @return {{startIndex: number, endIndex: number}[]}
     */
    topLevelSegments(startIndex?: number, endIndex?: number, delimiter?: TokenType): {
        startIndex: number;
        endIndex: number;
    }[];
}
/** @param {string} source @return {BalancedTokens | undefined} */
declare function balancedTokens(source: string): BalancedTokens | undefined;
export { TokenType, applyEdits, balancedTokens, decoded, numeric, numericSource, tokenEnd, tokenStart, tokens, };
//# sourceMappingURL=value.d.ts.map