export type SimpleOptions<OptionsExtends extends object | void = void> = false | (OptionsExtends & {
    exclude?: true;
});
export type LiteOptions = {
    discardComments?: SimpleOptions<import('postcss-discard-comments').Options>;
    normalizeWhitespace?: SimpleOptions;
    discardEmpty?: SimpleOptions;
    rawCache?: SimpleOptions;
};
/**
 * Safe and minimum transformation with just removing whitespaces, line breaks and comments
 *
 * @param {LiteOptions} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, LiteOptions[keyof LiteOptions]][] }}
 */
declare function litePreset(opts?: LiteOptions): {
    plugins: [import('postcss').PluginCreator<any>, LiteOptions[keyof LiteOptions]][];
};
declare const moduleExports: typeof litePreset;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map