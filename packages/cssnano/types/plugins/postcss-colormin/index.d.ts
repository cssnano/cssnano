import type browserslist from 'browserslist';
export type MinifyColorOptions = {
    hex?: boolean;
    alphaHex?: boolean;
    rgb?: boolean;
    hsl?: boolean;
    name?: boolean;
    transparent?: boolean;
    /**
     * Whether to minify colors inside custom property values (default: true)
     */
    transformCustomProperties?: boolean;
};
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
export type Options = MinifyColorOptions & AutoprefixerOptions & BrowserslistOptions;
/**
 * @typedef {object} MinifyColorOptions
 * @property {boolean} [hex]
 * @property {boolean} [alphaHex]
 * @property {boolean} [rgb]
 * @property {boolean} [hsl]
 * @property {boolean} [name]
 * @property {boolean} [transparent]
 * @property {boolean} [transformCustomProperties] Whether to minify colors inside custom property values (default: true)
 */
/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {MinifyColorOptions & AutoprefixerOptions & BrowserslistOptions} Options
 */
/**
 * @param {Options} config
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(config?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map