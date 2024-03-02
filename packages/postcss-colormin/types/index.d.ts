export = pluginCreator;
/**
 * @typedef {object} Options
 * @property {boolean} [hex]
 * @property {boolean} [alphaHex]
 * @property {boolean} [rgb]
 * @property {boolean} [hsl]
 * @property {boolean} [name]
 * @property {boolean} [transparent]
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} config
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(config?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    export { postcss, Options };
}
type Options = {
    hex?: boolean | undefined;
    alphaHex?: boolean | undefined;
    rgb?: boolean | undefined;
    hsl?: boolean | undefined;
    name?: boolean | undefined;
    transparent?: boolean | undefined;
};
declare var postcss: true;
