import cssnanoUtils from '#utils';
import convert from './convert.js';
export type ConvertOptions = Parameters<typeof convert>[2];
export type Options = {
    precision?: false | number;
    transformCustomProperties?: boolean;
} & ConvertOptions;
export type Spelling = import('./convert.js').Spelling;
export type CSSToken = ReturnType<typeof cssnanoUtils.tokens>[number];
export type ReplacementFlags = {
    keepZeroPercent: boolean;
    keepZeroLength: boolean;
    clampAlpha: boolean;
    isAlpha: boolean;
    isFont: boolean;
    isCustomProperty: boolean;
};
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
//# sourceMappingURL=findReplacements.d.ts.map