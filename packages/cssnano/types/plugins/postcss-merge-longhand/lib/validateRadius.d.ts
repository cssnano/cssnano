/**
 * Validates a single token / term as a non-negative <length-percentage> or unresolved function.
 *
 * @param {string} term
 * @param {import('@csstools/css-tokenizer').CSSToken[]} termTokens
 * @return {boolean}
 */
export declare function isValidLengthPercentage(term: string, termTokens: import('@csstools/css-tokenizer').CSSToken[]): boolean;
/**
 * Parses and validates a corner longhand value (e.g. `border-top-left-radius`).
 * Corner longhands accept 1 or 2 non-negative <length-percentage> values.
 *
 * @param {string} value
 * @return {[string, string] | null} [horizontal, vertical] or null if invalid
 */
export declare function parseCornerRadius(value: string): [string, string] | null;
/**
 * Parses and validates a `border-radius` shorthand value.
 * Accepts 1 to 4 horizontal components, optional `/`, and 1 to 4 vertical components.
 *
 * @param {string} value
 * @return {{horizontal: [string, string, string, string], vertical: [string, string, string, string]} | null}
 */
export declare function parseRadiusShorthand(value: string): {
    horizontal: [string, string, string, string];
    vertical: [string, string, string, string];
} | null;
/**
 * Checks whether a declaration value is a global CSS keyword.
 *
 * @param {string} value
 * @return {boolean}
 */
export declare function isGlobalKeyword(value: string): boolean;
//# sourceMappingURL=validateRadius.d.ts.map