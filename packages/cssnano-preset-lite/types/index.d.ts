export = litePreset;
/**
 * Safe and minimum transformation with just removing whitespaces, line breaks and comments
 *
 * @param {LiteOptions} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, LiteOptions[keyof LiteOptions]][] }}
 */
declare function litePreset(opts?: LiteOptions): {
    plugins: [import('postcss').PluginCreator<any>, LiteOptions[keyof LiteOptions]][];
};
declare namespace litePreset {
    export { SimpleOptions, LiteOptions };
}
type LiteOptions = {
    discardComments?: SimpleOptions<postcssDiscardComments.Options> | undefined;
    normalizeWhitespace?: SimpleOptions<void> | undefined;
    discardEmpty?: SimpleOptions<void> | undefined;
    rawCache?: SimpleOptions<void> | undefined;
};
type SimpleOptions<OptionsExtends extends void | object = void> = false | (OptionsExtends & {
    exclude?: true;
});
import postcssDiscardComments = require("postcss-discard-comments");
