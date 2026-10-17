export type MinifyColorOptions = {
    /**
     * Allows hexadecimal output, such as `#f00`. (default: true)
     */
    hex?: boolean;
    /**
     * Allows 4 and 8 digit hexadecimal output for translucent colors. (default: whether the browser targets support it)
     */
    alphaHex?: boolean;
    /**
     * Allows `rgb()` and `rgba()` output. (default: true)
     */
    rgb?: boolean;
    /**
     * Allows `hsl()` and `hsla()` output. (default: true)
     */
    hsl?: boolean;
    /**
     * Allows named colors, such as `red`. (default: true)
     */
    name?: boolean;
    /**
     * Allows the `transparent` keyword for a fully transparent color. Unknown browser targets keep `rgba()`. (default: whether the browser targets know `transparent`)
     */
    transparent?: boolean;
    /**
     * Minifies colors inside custom property values (`--*`). (default: true)
     */
    transformCustomProperties?: boolean;
};
export type Options = MinifyColorOptions;
/**
 * @typedef {object} MinifyColorOptions
 * @property {boolean} [hex] Allows hexadecimal output, such as `#f00`. (default: true)
 * @property {boolean} [alphaHex] Allows 4 and 8 digit hexadecimal output for translucent colors. (default: whether the browser targets support it)
 * @property {boolean} [rgb] Allows `rgb()` and `rgba()` output. (default: true)
 * @property {boolean} [hsl] Allows `hsl()` and `hsla()` output. (default: true)
 * @property {boolean} [name] Allows named colors, such as `red`. (default: true)
 * @property {boolean} [transparent] Allows the `transparent` keyword for a fully transparent color. Unknown browser targets keep `rgba()`. (default: whether the browser targets know `transparent`)
 * @property {boolean} [transformCustomProperties] Minifies colors inside custom property values (`--*`). (default: true)
 */
/**
 * @typedef {MinifyColorOptions} Options
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