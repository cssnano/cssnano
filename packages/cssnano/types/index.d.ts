export = cssnanoPlugin;
import postcss = require('postcss');
export type PresetPlugin = [import('postcss').PluginCreator<any>, boolean | Record<string, any> | void | undefined];
export type PresetSpec = string | [string | import('postcss').PluginCreator<any>, object] | import('postcss').PluginCreator<any> | {
    plugins: PresetPlugin[];
};
export type Options = {
    preset?: PresetSpec;
    plugins?: import('postcss').AcceptedPlugin[];
    configFile?: string;
};
export type MutableOptions = Omit<Options, 'preset'> & {
    preset: PresetSpec & {
        plugins: PresetPlugin[];
    };
};
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options=} options
 * @return {import('postcss').Processor}
 */
declare function cssnanoPlugin(options?: {}): postcss.Processor;
//# sourceMappingURL=index.d.ts.map