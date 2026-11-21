export type CSSToken = ReturnType<typeof import('#utils').default.balancedTokens> extends infer Structure ? Structure extends {
    tokens: readonly (infer Token)[];
} ? Token : never : never;
/** @typedef {ReturnType<typeof import('#utils').default.balancedTokens> extends infer Structure ? Structure extends {tokens: readonly (infer Token)[]} ? Token : never : never} CSSToken */
/**
 * Decoded (escape-resolved) spelling of an ident token, lowercased for
 * ASCII-case-insensitive keyword matching. Prefer the raw token spelling
 * (`token[1]`) when matching case-sensitive identifiers.
 * @param {CSSToken} token @return {string}
 */
export declare function decodedIdent(token: CSSToken): string;
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