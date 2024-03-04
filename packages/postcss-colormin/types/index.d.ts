export = pluginCreator;
/**
 * @typedef {object} MinifyColorOptions
 * @property {boolean} [hex]
 * @property {boolean} [alphaHex]
 * @property {boolean} [rgb]
 * @property {boolean} [hsl]
 * @property {boolean} [name]
 * @property {boolean} [transparent]
 */
/**
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {MinifyColorOptions & BrowserslistOptions} Options
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} config
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(config?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    export { postcss, MinifyColorOptions, BrowserslistOptions, Options };
}
type Options = MinifyColorOptions & BrowserslistOptions;
declare var postcss: true;
type MinifyColorOptions = {
    hex?: boolean | undefined;
    alphaHex?: boolean | undefined;
    rgb?: boolean | undefined;
    hsl?: boolean | undefined;
    name?: boolean | undefined;
    transparent?: boolean | undefined;
};
type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
import browserslist = require("browserslist");
