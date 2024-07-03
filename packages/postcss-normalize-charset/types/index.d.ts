export = pluginCreator;
/**
 * @typedef {{add?: boolean}} Options
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import("postcss").Plugin;
declare namespace pluginCreator {
    export { postcss, Options };
}
declare var postcss: true;
type Options = {
    add?: boolean;
};
//# sourceMappingURL=index.d.ts.map