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
 * A hex escape (`\\61 `) consumes one trailing whitespace (CSS Syntax 3
 * §4.3.7), which is redundant when a delimiter follows. An escaped whitespace
 * (`\\ `) is the escaped character itself and must stay. Callers must ensure
 * the next output character is not whitespace. A following hex digit keeps
 * the terminator unless the escape already has six digits.
 * @param {string} value
 * @param {boolean} [beforeHexDigit]
 */
export declare function dropHexEscapeTerminator(value: string, beforeHexDigit?: boolean): string;
/**
 * Unquotes a string body only when it is an ASCII identifier without escapes.
 * Any other body is returned quoted.
 * @param {string} value
 */
export declare function unquote(value: string): string;
//# sourceMappingURL=tokenUtils.d.ts.map