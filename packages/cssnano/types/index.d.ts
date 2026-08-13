export = cssnanoPlugin;
import postcss = require('postcss');
export type Options = {
    preset?: any;
    plugins?: any[];
    configFile?: string;
};
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options=} options
 * @return {import('postcss').Processor}
 */
declare function cssnanoPlugin(options?: {}): postcss.Processor;
//# sourceMappingURL=index.d.ts.map