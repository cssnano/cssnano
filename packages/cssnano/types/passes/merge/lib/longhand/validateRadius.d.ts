export type RadiusPiece = {
    raw: string;
    list: readonly import('@csstools/css-tokenizer').CSSToken[];
    start: number;
    end: number;
};
/**
 * Validates a single token / term as a non-negative <length-percentage> or unresolved function.
 *
 * @param {import('@csstools/css-tokenizer').CSSToken[]} termTokens
 * @return {boolean}
 */
export declare function isValidLengthPercentage(termTokens: import('@csstools/css-tokenizer').CSSToken[]): boolean;
/**
 * Parses and validates a corner longhand value (e.g. `border-top-left-radius`).
 * Corner longhands accept 1 or 2 non-negative <length-percentage> values.
 *
 * @param {string} value
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [list] the tokens of `value`
 * @return {[RadiusPiece, RadiusPiece] | null} [horizontal, vertical] or null if invalid
 */
export declare function parseCornerRadius(value: string, list?: readonly import('@csstools/css-tokenizer').CSSToken[]): [RadiusPiece, RadiusPiece] | null;
/**
 * Parses and validates a `border-radius` shorthand value.
 * Accepts 1 to 4 horizontal components, optional `/`, and 1 to 4 vertical components.
 *
 * @param {string} value
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [list] the tokens of `value`
 * @return {{horizontal: [RadiusPiece, RadiusPiece, RadiusPiece, RadiusPiece], vertical: [RadiusPiece, RadiusPiece, RadiusPiece, RadiusPiece]} | null}
 */
export declare function parseRadiusShorthand(value: string, list?: readonly import('@csstools/css-tokenizer').CSSToken[]): {
    horizontal: [RadiusPiece, RadiusPiece, RadiusPiece, RadiusPiece];
    vertical: [RadiusPiece, RadiusPiece, RadiusPiece, RadiusPiece];
} | null;
/**
 * Checks whether a declaration value is a global CSS keyword.
 *
 * @param {string} value
 * @return {boolean}
 */
export declare function isGlobalKeyword(value: string): boolean;
//# sourceMappingURL=validateRadius.d.ts.map