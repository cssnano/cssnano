import cssDeclarationSorter from 'css-declaration-sorter';
import autoprefixer from 'autoprefixer';
export type SimpleOptions<OptionsExtends extends object | void = void> = false | (OptionsExtends & {
    exclude?: true;
});
export type AdvancedOptions = {
    cssDeclarationSorter?: SimpleOptions<Parameters<typeof cssDeclarationSorter>[0]>;
    autoprefixer?: autoprefixer.Options;
    discardUnused?: SimpleOptions<import('postcss-discard-unused').Options>;
    mergeIdents?: SimpleOptions;
    reduceIdents?: SimpleOptions<import('postcss-reduce-idents').Options>;
    zindex?: SimpleOptions<import('postcss-zindex').Options>;
};
export type AutoprefixerOptions = defaultPreset.AutoprefixerOptions;
export type BrowserslistOptions = defaultPreset.BrowserslistOptions;
export type Options = defaultPreset.Options & AdvancedOptions;
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
//# sourceMappingURL=index.d.ts.map