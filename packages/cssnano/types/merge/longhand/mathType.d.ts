import type { CSSToken } from '@csstools/css-tokenizer';
export type MathType = 'number' | 'length' | 'percentage' | 'length-percentage';
export type MathFunction = {
    /**
     * the fewest arguments
     */
    least: number;
    /**
     * the most arguments
     */
    most: number;
    /**
     * how the result type
     * follows from the arguments: the common type, a number of any type, or a
     * number from numbers only
     */
    rule: 'same' | 'toNumber' | 'numbersOnly';
    /**
     * whether a rounding strategy may lead
     */
    strategy?: boolean;
};
/** The math function names this module types, in lowercase. */
export declare const mathFunctionNames: Set<string>;
/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start the index of the first token of the expression
 * @param {number} end the index just past its last token
 * @return {MathType | undefined} the type of a math function or a
 * parenthesized expression; `undefined` when a user agent rejects the
 * expression or this module cannot tell
 */
export declare function mathType(tokens: readonly CSSToken[], start: number, end: number): MathType | undefined;
/**
 * Whether a component that opens with a substitution or math function can be
 * a value of one of the given types. A browser ignores a declaration whose
 * math function types as anything else, such as `calc(10%)` for a width, and
 * a substitution function defers the check to computed-value time. Anything
 * this cannot type fails closed.
 *
 * The range must be exactly one function, as `calc(1%) var(--x)` is two
 * components and a substitution in the second must not vouch for the first.
 *
 * @param {readonly CSSToken[] | undefined} tokens
 * @param {number} start
 * @param {number} end
 * @param {readonly MathType[]} accepted the types the property's grammar takes
 * @return {boolean}
 */
export declare function isFunctionOfType(tokens: readonly CSSToken[] | undefined, start: number, end: number, accepted: readonly MathType[]): boolean;
//# sourceMappingURL=mathType.d.ts.map