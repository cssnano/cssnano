export = defaultPreset;
/**
 * Safe defaults for cssnano which require minimal configuration
 *
 * @param {Options} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][] }}
 */
declare function defaultPreset(opts?: Options): {
    plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][];
};
declare namespace defaultPreset {
    export { SimpleOptions, Options };
}
type Options = {
    discardComments?: SimpleOptions<postcssDiscardComments.Options> | undefined;
    reduceInitial?: SimpleOptions<void> | undefined;
    minifyGradients?: SimpleOptions<void> | undefined;
    svgo?: SimpleOptions<postcssSvgo.Options> | undefined;
    reduceTransforms?: SimpleOptions<void> | undefined;
    convertValues?: SimpleOptions<postcssConvertValues.Options> | undefined;
    calc?: SimpleOptions<postcssCalc.PostCssCalcOptions> | undefined;
    colormin?: SimpleOptions<Record<string, any>> | undefined;
    orderedValues?: SimpleOptions<void> | undefined;
    minifySelectors?: SimpleOptions<void> | undefined;
    minifyParams?: SimpleOptions<void> | undefined;
    normalizeCharset?: SimpleOptions<postcssNormalizeCharset.Options> | undefined;
    minifyFontValues?: SimpleOptions<postcssMinifyFontValues.Options> | undefined;
    normalizeUrl?: SimpleOptions<void> | undefined;
    mergeLonghand?: SimpleOptions<void> | undefined;
    discardDuplicates?: SimpleOptions<void> | undefined;
    discardOverridden?: SimpleOptions<void> | undefined;
    normalizeRepeatStyle?: SimpleOptions<void> | undefined;
    mergeRules?: SimpleOptions<void> | undefined;
    discardEmpty?: SimpleOptions<void> | undefined;
    uniqueSelectors?: SimpleOptions<void> | undefined;
    normalizeString?: SimpleOptions<postcssNormalizeString.Options> | undefined;
    normalizePositions?: SimpleOptions<void> | undefined;
    normalizeWhitespace?: SimpleOptions<void> | undefined;
    normalizeUnicode?: SimpleOptions<void> | undefined;
    normalizeDisplayValues?: SimpleOptions<void> | undefined;
    normalizeTimingFunctions?: SimpleOptions<void> | undefined;
    rawCache?: SimpleOptions<void> | undefined;
};
type SimpleOptions<OptionsExtends extends void | object = void> = false | (OptionsExtends & {
    exclude?: true;
});
import postcssDiscardComments = require("postcss-discard-comments");
import postcssSvgo = require("postcss-svgo");
import postcssConvertValues = require("postcss-convert-values");
import postcssCalc = require("postcss-calc");
import postcssNormalizeCharset = require("postcss-normalize-charset");
import postcssMinifyFontValues = require("postcss-minify-font-values");
import postcssNormalizeString = require("postcss-normalize-string");
