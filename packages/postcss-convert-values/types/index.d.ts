export = pluginCreator;
/**
 * @typedef {Parameters<typeof convert>[2]} ConvertOptions
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {{precision?: false | number} & ConvertOptions & AutoprefixerOptions & BrowserslistOptions} Options
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import("postcss").Plugin;
declare namespace pluginCreator {
    export { postcss, ConvertOptions, AutoprefixerOptions, BrowserslistOptions, Options };
}
declare var postcss: true;
type ConvertOptions = Parameters<typeof convert>[2];
type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
type BrowserslistOptions = Pick<browserslist.Options, "stats" | "path" | "env">;
type Options = {
    precision?: false | number;
} & ConvertOptions & AutoprefixerOptions & BrowserslistOptions;
import convert = require("./lib/convert.js");
import browserslist = require("browserslist");
//# sourceMappingURL=index.d.ts.map