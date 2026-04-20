export = pluginCreator;
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
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts: Options): import("postcss").Plugin;
declare namespace pluginCreator {
    export { postcss, AutoprefixerOptions, BrowserslistOptions, OwnOptions, Options };
}
declare var postcss: true;
type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
type BrowserslistOptions = Pick<browserslist.Options, "stats" | "path" | "env">;
type OwnOptions = {
    sort?: boolean | undefined;
    /**
     * Factor shared prefixes/suffixes in a
     * comma-separated selector list into `:is(...)` when it produces shorter
     * output and is safe with respect to cascade specificity. Automatically
     * skipped when the configured browserslist target doesn't support `:is()`.
     */
    convertToIs?: boolean | undefined;
};
type Options = OwnOptions & AutoprefixerOptions & BrowserslistOptions;
import browserslist = require("browserslist");
//# sourceMappingURL=index.d.ts.map