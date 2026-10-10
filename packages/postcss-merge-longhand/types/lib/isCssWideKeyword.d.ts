/**
 * @param {string} value - a declaration value, in any letter case
 * @return {boolean} whether it is exactly one CSS-wide keyword
 */
export declare function isCssWideKeyword(value: string): boolean;
/**
 * A shorthand holds one CSS-wide keyword for all its slots, or none of them.
 *
 * @param {string[]} values - the slot values in order
 * @return {boolean} whether the values can share one shorthand value
 */
export declare function sharesShorthandKeyword(values: string[]): boolean;
//# sourceMappingURL=isCssWideKeyword.d.ts.map