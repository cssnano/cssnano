export type FunctionFrame = {
    name: string | null;
    expected: import('@csstools/css-tokenizer').TokenType;
    commas: number;
    hasValue: boolean;
};
export type Component = {
    raw: string;
    tokens: import('@csstools/css-tokenizer').CSSToken[];
};
/** @typedef {{name: string | null, expected: import('@csstools/css-tokenizer').TokenType, commas: number, hasValue: boolean}} FunctionFrame */
/**
 * @typedef {{raw: string, tokens: import('@csstools/css-tokenizer').CSSToken[]}}
 *   Component
 */
/** @param {import('@csstools/css-tokenizer').CSSToken} token @return {string} */
export declare function tokenName(token: import('@csstools/css-tokenizer').CSSToken): string;
/** @param {Component} component @return {string} */
export declare function componentName(component: Component): string;
/**
 * Return a semantic comparison key without reserializing the component. Raw
 * source is still used for output; decoding is only for classification and
 * equality of case-insensitive CSS tokens.
 *
 * @param {Component} component
 * @return {string}
 */
export declare function componentKey(component: Component): string;
/** @param {Component} component @return {boolean} */
export declare function hasCssWideKeyword(component: Component): boolean;
/**
 * Check function names recursively. Detailed value grammar belongs to the
 * individual reducer; rejecting unknown and substitution functions here keeps
 * every reducer conservative without losing raw function spelling.
 *
 * @param {Component} component
 * @param {Set<string>} allowed
 * @return {boolean}
 */
export declare function hasAllowedFunctions(component: Component, allowed: Set<string>): boolean;
/** @param {import('@csstools/css-tokenizer').CSSToken[]} input @return {boolean} */
export declare function hasValidFunctionSyntax(input: import('@csstools/css-tokenizer').CSSToken[]): boolean;
/** @param {Component} component @return {{number: number, unit: string} | false} */
export declare function directNumeric(component: Component): {
    number: number;
    unit: string;
} | false;
/**
 * @param {Component} component
 * @param {{percentage: boolean, auto: boolean, nonNegative?: boolean}}
 *   grammar
 * @return {boolean}
 */
export declare function isLengthComponent(component: Component, grammar: {
    percentage: boolean;
    auto: boolean;
    nonNegative?: boolean;
}): boolean;
//# sourceMappingURL=shorthandValueGrammar.d.ts.map