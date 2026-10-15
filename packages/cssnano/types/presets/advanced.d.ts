export type SimpleOptions<OptionsExtends extends object | void = void> = false | (OptionsExtends & {
    exclude?: true;
});
export type AdvancedOptions = {
    discardUnused?: SimpleOptions<import('#postcss-discard-unused').Options>;
    mergeIdents?: SimpleOptions;
    reduceIdents?: SimpleOptions<import('#postcss-reduce-idents').Options>;
    zindex?: SimpleOptions<import('#postcss-zindex').Options>;
};
export type AutoprefixerOptions = import('#presets/default').AutoprefixerOptions;
export type BrowserslistOptions = import('#presets/default').BrowserslistOptions;
export type Options = import('#presets/default').Options & AdvancedOptions;
/**
 * Advanced optimisations for cssnano; may or may not break your CSS!
 *
 * @param {Options & AutoprefixerOptions & BrowserslistOptions} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][] }}
 */
declare function advancedPreset(opts?: Options & AutoprefixerOptions & BrowserslistOptions): {
    plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][];
};
declare const moduleExports: typeof advancedPreset;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=advanced.d.ts.map