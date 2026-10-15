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
 * @param {string} value
 * @param {{ unicodeRangesAllowed?: boolean }} [options]
 * @return {CSSToken[]}
 */
declare function tokens(value: string, options?: {
    unicodeRangesAllowed?: boolean;
}): CSSToken[];
/** @param {CSSToken} token @return {number} */
declare function tokenStart(token: CSSToken): number;
/** @param {CSSToken} token @return {number} */
declare function tokenEnd(token: CSSToken): number;
/**
 * Apply non-overlapping source edits. Invalid source bounds and overlaps fail
 * closed, preserving the complete input instead of a partial rewrite.
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
 * @param {TokenType} type
 * @return {TokenType | undefined}
 */
declare function closeForOpening(type: TokenType): TokenType | undefined;
/**
 * Reports whether a value ends in a backslash that begins an escape
 * sequence, as opposed to a backslash that is itself escaped.
 * @param {string} value
 * @return {boolean}
 */
declare function endsWithEscapingBackslash(value: string): boolean;
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
export { TokenType, applyEdits, balancedTokens, closeForOpening, decoded, endsWithEscapingBackslash, numeric, tokenEnd, tokenStart, tokens, };
//# sourceMappingURL=value.d.ts.map