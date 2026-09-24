import convert from './convert.js';
export type ConvertOptions = Parameters<typeof convert>[2];
export type Options = {
    precision?: false | number;
    transformCustomProperties?: boolean;
} & ConvertOptions & {
    overrideBrowserslist?: string | string[];
} & import('browserslist').Options;
export type NumericSource = {
    index: number;
    start: number;
    end: number;
    raw: string;
    number: number;
    unit: string;
    hasDecimal: boolean;
};
/** @param {Options} opts @param {boolean | string[]} supportsIE @param {import('postcss').Declaration} decl @param {Map<string, string>} [cache] @return {void} */
export default function transform(opts: Options, supportsIE: boolean | string[], decl: import('postcss').Declaration, cache?: Map<string, string>): void;
//# sourceMappingURL=transform.d.ts.map