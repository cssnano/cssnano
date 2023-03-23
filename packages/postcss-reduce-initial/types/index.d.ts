export = pluginCreator;
/** @typedef {{ignore?: string[]}} Options */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(options?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    export { postcss, Options };
}
type Options = {
    ignore?: string[];
};
declare var postcss: true;
