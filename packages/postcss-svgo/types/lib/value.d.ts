import { TokenType } from '@csstools/css-tokenizer';
export type CSSToken = import('@csstools/css-tokenizer').CSSToken;
export type SourceEdit = {
    start: number;
    end: number;
    text: string;
};
/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/** @typedef {{start: number, end: number, text: string}} SourceEdit */
/** @param {CSSToken} token @return {string} */
declare function decoded(token: CSSToken): string;
/**
 * Apply non-overlapping source edits. Invalid source bounds and overlaps fail
 * closed, preserving the complete input instead of a partial rewrite.
 *
 * @param {string} source
 * @param {SourceEdit[]} edits
 * @return {string}
 */
declare function applyEdits(source: string, edits: SourceEdit[]): string;
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
/**
 * @param {string} source
 * @param {{ unicodeRangesAllowed?: boolean }} [options]
 * @return {BalancedTokens | undefined}
 */
declare function balancedTokens(source: string, options?: {
    unicodeRangesAllowed?: boolean;
}): BalancedTokens | undefined;
export { applyEdits, balancedTokens, decoded };
//# sourceMappingURL=value.d.ts.map