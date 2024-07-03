export = advancedPreset;
/**
 * Advanced optimisations for cssnano; may or may not break your CSS!
 *
 * @param {Options & AutoprefixerOptions & BrowserslistOptions} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][] }}
 */
declare function advancedPreset(opts?: Options & AutoprefixerOptions & BrowserslistOptions): {
    plugins: [import("postcss").PluginCreator<any>, Options[keyof Options]][];
};
declare namespace advancedPreset {
    export { SimpleOptions, AdvancedOptions, AutoprefixerOptions, BrowserslistOptions, Options };
}
type SimpleOptions<OptionsExtends extends object | void = void> = false | (OptionsExtends & {
    exclude?: true;
});
type AdvancedOptions = {
    autoprefixer?: autoprefixer.Options | undefined;
    discardUnused?: SimpleOptions<postcssDiscardUnused.Options> | undefined;
    mergeIdents?: SimpleOptions<void> | undefined;
    reduceIdents?: SimpleOptions<postcssReduceIdents.Options> | undefined;
    zindex?: SimpleOptions<postcssZindex.Options> | undefined;
};
type AutoprefixerOptions = defaultPreset.AutoprefixerOptions;
type BrowserslistOptions = defaultPreset.BrowserslistOptions;
type Options = defaultPreset.Options & AdvancedOptions;
import autoprefixer = require("autoprefixer");
import postcssDiscardUnused = require("postcss-discard-unused");
import postcssReduceIdents = require("postcss-reduce-idents");
import postcssZindex = require("postcss-zindex");
import defaultPreset = require("cssnano-preset-default");
//# sourceMappingURL=index.d.ts.map