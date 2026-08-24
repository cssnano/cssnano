import type browserslist from 'browserslist';
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
export type OwnOptions = {
    sort?: boolean;
    /**
     * Factor shared prefixes/suffixes in a
     * comma-separated selector list into `:is(...)` when it produces shorter
     * output and is safe with respect to cascade specificity. Automatically
     * skipped when the configured browserslist target doesn't support `:is()`.
     */
    convertToIs?: boolean;
};
export type Options = OwnOptions & AutoprefixerOptions & BrowserslistOptions;
/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 */
/**
 * @typedef {object} OwnOptions
 * @property {boolean} [sort=true]
 * @property {boolean} [convertToIs=true] Factor shared prefixes/suffixes in a
 *   comma-separated selector list into `:is(...)` when it produces shorter
 *   output and is safe with respect to cascade specificity. Automatically
 *   skipped when the configured browserslist target doesn't support `:is()`.
 */
/** @typedef {OwnOptions & AutoprefixerOptions & BrowserslistOptions} Options */
/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map