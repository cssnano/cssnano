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
 * Unquotes a string body only when it is an ASCII identifier without escapes.
 * Any other body is returned quoted.
 * @param {string} value
 */
export declare function unquote(value: string): string;
//# sourceMappingURL=tokenUtils.d.ts.map