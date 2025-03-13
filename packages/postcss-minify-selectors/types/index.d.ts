export = pluginCreator;
/** @typedef {object} Options
+ *  @property {boolean=} preserveOrder
+ */
/**
 * @type {import('postcss').PluginCreator<void>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import("postcss").Plugin;
declare namespace pluginCreator {
    export { postcss, Options };
}
declare var postcss: true;
type Options = {
    preserveOrder?: boolean | undefined;
};
//# sourceMappingURL=index.d.ts.map