import convert from './convert.js';
export type ConvertOptions = Parameters<typeof convert>[2];
export type Options = {
    precision?: false | number;
    transformCustomProperties?: boolean;
} & ConvertOptions & {
    overrideBrowserslist?: string | string[];
} & import('browserslist').Options;
/** @param {Options} opts @param {string[]} browsers @param {import('postcss').Declaration} decl @return {void} */
export default function transform(opts: Options, browsers: string[], decl: import('postcss').Declaration): void;
//# sourceMappingURL=transform.d.ts.map