import postcss from 'postcss';
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
};
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options=} options
 * @return {import('postcss').Processor}
 */
declare function cssnanoPlugin(options?: {}): postcss.Processor;
export { cssnanoPlugin as default, cssnanoPlugin as 'module.exports' };
//# sourceMappingURL=index.d.ts.map