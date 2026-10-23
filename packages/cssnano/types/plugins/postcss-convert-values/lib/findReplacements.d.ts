import convert from './convert.js';
declare const tokens: typeof import("../../../utils/value.js").tokens;
export type ConvertOptions = Parameters<typeof convert>[2];
export type Options = {
    precision?: false | number;
    transformCustomProperties?: boolean;
} & ConvertOptions;
export type Spelling = import('./convert.js').Spelling;
export type CSSToken = ReturnType<typeof tokens>[number];
export type ReplacementFlags = {
    keepZeroPercent: boolean;
    keepZeroLength: boolean;
    clampAlpha: boolean;
    isAlpha: boolean;
    isFont: boolean;
    isCustomProperty: boolean;
};
/**
 * A custom property with a `U+` range may be read as `unicode-range` or as
 * anything else, and `u+1.0e2` is a range then a number in one, a single
 * number in the other, so no edit is safe for both.
 *
 * @param {string} value
 * @return {boolean}
 */
export declare function containsUnicodeRange(value: string): boolean;
/** @param {string} str @return {string} */
export declare function stripVendorPrefix(str: string): string;
export type NumericSource = {
    index: number;
    raw: string;
    number: number;
    unit: string;
    hasDecimal: boolean;
};
/**
 * The edits that shorten the numbers of a value, each replacing the tokens of
 * one number, sign included, with one token. Edits come in ascending order,
 * ready for ValueBuffer.replaceRanges.
 *
 * @param {readonly CSSToken[]} input the tokens of the value
 * @param {ReplacementFlags} flags
 * @param {Options} opts
 * @return {{start: number, end: number, tokens: CSSToken[]}[]}
 */
export declare function findReplacements(input: readonly CSSToken[], flags: ReplacementFlags, opts: Options): {
    start: number;
    end: number;
    tokens: CSSToken[];
}[];
export {};
//# sourceMappingURL=findReplacements.d.ts.map