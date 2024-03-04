export = pluginCreator;
/**
 * @typedef {Pick<browserslist.Options, 'stats' | 'env'>} BrowserslistOptions
 * @typedef {{lint?: boolean} & BrowserslistOptions} Options
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    export { detect, postcss, BrowserslistOptions, Options };
}
type Options = {
    lint?: boolean;
} & BrowserslistOptions;
declare function detect(node: import('postcss').Node): boolean;
declare var postcss: true;
type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'env'>;
import browserslist = require("browserslist");
