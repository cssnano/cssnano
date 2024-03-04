export = pluginCreator;
/**
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {BrowserslistOptions} Options
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    export { postcss, BrowserslistOptions, Options };
}
type Options = BrowserslistOptions;
declare var postcss: true;
type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
import browserslist = require("browserslist");
