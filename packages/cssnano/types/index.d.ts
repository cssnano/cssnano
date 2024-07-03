export = cssnanoPlugin;
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options=} options
 * @return {import('postcss').Processor}
 */
declare function cssnanoPlugin(options?: Options | undefined): import("postcss").Processor;
declare namespace cssnanoPlugin {
    export { postcss, Options };
}
declare var postcss: true;
type Options = {
    preset?: any;
    plugins?: any[];
    configFile?: string;
};
//# sourceMappingURL=index.d.ts.map