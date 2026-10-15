import convert from './convert.js';
export type ConvertOptions = Parameters<typeof convert>[2];
export type Options = {
    precision?: false | number;
    transformCustomProperties?: boolean;
} & ConvertOptions & {
    overrideBrowserslist?: string | string[];
} & import('browserslist').Options;
export type ReplacementFlags = {
    keepZeroPercent: boolean;
    keepZeroLength: boolean;
    clampAlpha: boolean;
    isAlpha: boolean;
    isFont: boolean;
};
/** @param {string} str @return {string} */
export declare function stripVendorPrefix(str: string): string;
export type NumericSource = {
    index: number;
    start: number;
    end: number;
    raw: string;
    number: number;
    unit: string;
    hasDecimal: boolean;
};
/**
 * @param {string} value
 * @param {ReplacementFlags} flags
 * @param {Options} opts
 * @return {{start: number, end: number, text: string}[]}
 */
export declare function findReplacements(value: string, flags: ReplacementFlags, opts: Options): {
    start: number;
    end: number;
    text: string;
}[];
//# sourceMappingURL=findReplacements.d.ts.map