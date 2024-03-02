export = advancedPreset;
/**
 * Advanced optimisations for cssnano; may or may not break your CSS!
 *
 * @param {Options} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][] }}
 */
declare function advancedPreset(opts?: Options): {
    plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][];
};
declare namespace advancedPreset {
    export { SimpleOptions, AdvancedOptions, Options };
}
type Options = defaultPreset.Options & AdvancedOptions;
type SimpleOptions<OptionsExtends extends void | object = void> = false | (OptionsExtends & {
    exclude?: true;
});
type AdvancedOptions = {
    autoprefixer?: autoprefixer.Options | undefined;
    discardUnused?: SimpleOptions<postcssDiscardUnused.Options> | undefined;
    mergeIdents?: SimpleOptions<void> | undefined;
    reduceIdents?: SimpleOptions<postcssReduceIdents.Options> | undefined;
    zindex?: SimpleOptions<postcssZindex.Options> | undefined;
};
import defaultPreset = require("cssnano-preset-default");
import autoprefixer = require("autoprefixer");
import postcssDiscardUnused = require("postcss-discard-unused");
import postcssReduceIdents = require("postcss-reduce-idents");
import postcssZindex = require("postcss-zindex");
