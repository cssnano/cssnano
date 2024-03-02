export = pluginCreator;
/**
 * @typedef {Pick<browserslist.Options, 'stats' | 'env'>} BrowserslistOptions
 */
/**
 * @type {import('postcss').PluginCreator<void>}
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(): import('postcss').Plugin;
declare namespace pluginCreator {
    export { postcss, BrowserslistOptions };
}
declare var postcss: true;
type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'env'>;
import browserslist = require("browserslist");
