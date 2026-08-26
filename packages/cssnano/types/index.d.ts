export type PluginOptions = boolean | {
    exclude?: boolean;
} | void | undefined;
export type PluginCreator = import('postcss').PluginCreator<any>;
export type PresetPlugin = [PluginCreator, PluginOptions];
export type PresetFactory = (options?: any) => {
    plugins: PresetPlugin[];
};
export type PresetSpec = string | PresetFactory | [string | PresetFactory, object] | {
    plugins: PresetPlugin[];
};
export type PluginSpec = string | PluginCreator | [string | PluginCreator, object?];
export type Options = {
    preset?: PresetSpec;
    plugins?: PluginSpec[];
    configFile?: string;
};
/**
 * @param {Options=} options
 * @return {import('postcss').Processor}
 */
declare function cssnanoPlugin(options?: Options | undefined): import('postcss').Processor;
declare namespace cssnanoPlugin {
    var _a: true;
    export { _a as postcss };
}
export { cssnanoPlugin as default, cssnanoPlugin as 'module.exports' };
//# sourceMappingURL=index.d.ts.map