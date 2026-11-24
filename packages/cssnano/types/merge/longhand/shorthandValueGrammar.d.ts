export type FunctionFrame = {
    name: string | null;
    expected: import('@csstools/css-tokenizer').TokenType;
    commas: number;
    hasValue: boolean;
};
import type { Component } from './valueComponents.js';
/**
 * name is null for a bare parenthesized group. Math is typed by mathType, so a
 * frame needs no calculation state.
 *
 * @typedef {{name: string | null, expected: import('@csstools/css-tokenizer').TokenType, commas: number, hasValue: boolean}} FunctionFrame
 */
/** @import {Component} from './valueComponents.js' */
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
 * Checks the nesting, commas and argument counts of a timing function such as
 * `cubic-bezier(0, 0, 1, 1)`. Only the names in `timingFunctions` may open a
 * function. The grammar does not check the argument values.
 *
 * @param {Component} component
 * @param {Set<string>} timingFunctions
 * @return {boolean}
 */
export declare function hasTimingFunctionArguments(component: Component, timingFunctions: Set<string>): boolean;
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