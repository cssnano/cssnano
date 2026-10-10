export type CSSToken = ReturnType<typeof import('cssnano-utils').default.balancedTokens> extends infer Structure ? Structure extends {
    tokens: readonly (infer Token)[];
} ? Token : never : never;
/** @typedef {ReturnType<typeof import('cssnano-utils').default.balancedTokens> extends infer Structure ? Structure extends {tokens: readonly (infer Token)[]} ? Token : never : never} CSSToken */
/**
 * Decoded (escape-resolved) spelling of an ident token, lowercased for
 * ASCII-case-insensitive keyword matching. Prefer the raw token spelling
 * (`token[1]`) when matching case-sensitive identifiers.
 * @param {CSSToken} token @return {string}
 */
export declare function decodedIdent(token: CSSToken): string;
/**
 * Whitespace and comments separate tokens without contributing to a selector.
 * @param {CSSToken | undefined} token
 */
export declare function isTrivia(token: CSSToken | undefined): token is import("@csstools/css-tokenizer").TokenComment | import("@csstools/css-tokenizer").TokenWhitespace;
/**
 * Index of the first token in `[index, end)` that is not trivia, or `end`.
 * @param {readonly CSSToken[]} input
 * @param {number} index
 * @param {number} end
 */
export declare function skipTrivia(input: readonly CSSToken[], index: number, end: number): number;
/**
 * Minifiers keep `/*!` comments, such as license notices.
 * @param {CSSToken} token
 */
export declare function isImportantCommentToken(token: CSSToken): boolean;
/**
 * Whitespace and ordinary comments vanish from minified arguments, while
 * important comments (`/*!`) survive into the output.
 * @param {CSSToken} token
 * @param {string[]} pieces
 * @return {boolean} whether the token was trivia
 */
export declare function consumeTrivia(token: CSSToken, pieces: string[]): boolean;
/**
 * Digit count of the hex escape that ends just before `end`, or 0 when no
 * hex escape ends there.
 * @param {string} value
 * @param {number} end
 */
export declare function hexEscapeDigitCount(value: string, end: number): number;
/**
 * A hex escape (`\61 `) consumes one trailing whitespace (CSS Syntax 3
 * §4.3.7), so serializers keep idents without that terminator and let
 * `needsHexEscapeTerminator` restore it where the neighbor requires one. An
 * escaped whitespace (`\ `) is the escaped character itself and must stay.
 * Within an ident, a terminator is only kept before a hex digit or another
 * whitespace.
 * @param {string} value
 */
export declare function dropHexEscapeTerminator(value: string): string;
/**
 * The single rule for restoring hex escape terminators: every joiner calls it
 * between adjacent pieces. Whether `before` ends in a hex escape that `after`
 * would extend: a leading whitespace is absorbed as its terminator, and a
 * leading hex digit becomes part of the escape unless it already has six
 * digits.
 * @param {string} before
 * @param {string} after
 */
export declare function needsHexEscapeTerminator(before: string, after: string): boolean;
/**
 * `needsHexEscapeTerminator` for a caller that already knows the digit count
 * of the escape ending the preceding piece and the first code of the next.
 * @param {number} digits
 * @param {number} next
 */
export declare function needsTerminatorAfterDigits(digits: number, next: number): boolean;
/**
 * Concatenates serialized pieces, adding the hex escape terminators that
 * `dropHexEscapeTerminator` removed.
 * @param {readonly string[]} pieces
 */
export declare function joinPieces(pieces: readonly string[]): string;
/**
 * Unquotes a string body only when it is an ASCII identifier without escapes.
 * Any other body is returned quoted.
 * @param {string} value
 */
export declare function unquote(value: string): string;
//# sourceMappingURL=tokenUtils.d.ts.map