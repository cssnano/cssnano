export = pluginCreator;
/**
 * @typedef {Pick<browserslist.Options, 'stats' | 'env'>} BrowserslistOptions
 * @typedef {{ignore?: string[]} & BrowserslistOptions} Options
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(options?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    export { postcss, BrowserslistOptions, Options };
}
type Options = {
    ignore?: string[];
} & BrowserslistOptions;
declare var postcss: true;
type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'env'>;
import browserslist = require("browserslist");
