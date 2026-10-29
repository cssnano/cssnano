import type { Component } from './valueComponents.js';
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
 * @return {[Component, Component] | null} [horizontal, vertical] or null if invalid
 */
export declare function parseCornerRadius(value: string, list?: readonly import('@csstools/css-tokenizer').CSSToken[]): [Component, Component] | null;
/**
 * Parses and validates a `border-radius` shorthand value.
 * Accepts 1 to 4 horizontal components, optional `/`, and 1 to 4 vertical components.
 *
 * @param {string} value
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [list] the tokens of `value`
 * @return {{horizontal: [Component, Component, Component, Component], vertical: [Component, Component, Component, Component]} | null}
 */
export declare function parseRadiusShorthand(value: string, list?: readonly import('@csstools/css-tokenizer').CSSToken[]): {
    horizontal: [Component, Component, Component, Component];
    vertical: [Component, Component, Component, Component];
} | null;
/**
 * Checks whether a declaration value is a global CSS keyword.
 *
 * @param {string} value
 * @return {boolean}
 */
export declare function isGlobalKeyword(value: string): boolean;
//# sourceMappingURL=validateRadius.d.ts.map