export = defaultPreset;
export type SimpleOptions<OptionsExtends extends object | void = void> = false | (OptionsExtends & {
    exclude?: true;
});
export type Options = {
    discardComments?: SimpleOptions<import('postcss-discard-comments').Options>;
    reduceInitial?: SimpleOptions<import('postcss-reduce-initial').Options>;
    minifyGradients?: SimpleOptions;
    svgo?: SimpleOptions<import('postcss-svgo').Options>;
    reduceTransforms?: SimpleOptions;
    convertValues?: SimpleOptions<import('postcss-convert-values').Options>;
    calc?: SimpleOptions<import('postcss-calc').PostCssCalcOptions>;
    colormin?: SimpleOptions<import('postcss-colormin').Options>;
    orderedValues?: SimpleOptions;
    minifySelectors?: SimpleOptions<import('postcss-minify-selectors').Options>;
    minifyParams?: SimpleOptions<import('postcss-minify-params').Options>;
    normalizeCharset?: SimpleOptions<import('postcss-normalize-charset').Options>;
    minifyFontValues?: SimpleOptions<import('postcss-minify-font-values').Options>;
    normalizeUrl?: SimpleOptions;
    mergeLonghand?: SimpleOptions;
    discardDuplicates?: SimpleOptions;
    discardOverridden?: SimpleOptions;
    normalizeRepeatStyle?: SimpleOptions;
    mergeRules?: SimpleOptions<import('postcss-merge-rules').Options>;
    discardEmpty?: SimpleOptions;
    uniqueSelectors?: SimpleOptions;
    normalizeString?: SimpleOptions<import('postcss-normalize-string').Options>;
    normalizePositions?: SimpleOptions;
    normalizeWhitespace?: SimpleOptions;
    normalizeUnicode?: SimpleOptions<import('postcss-normalize-unicode').Options>;
    normalizeDisplayValues?: SimpleOptions;
    normalizeTimingFunctions?: SimpleOptions;
    rawCache?: SimpleOptions;
};
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<import('browserslist').Options, 'stats' | 'path' | 'env'>;
/**
 * Safe defaults for cssnano which require minimal configuration
 *
 * @param {Options & AutoprefixerOptions & BrowserslistOptions} opts
 * @returns {{ plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][] }}
 */
declare function defaultPreset(opts?: Options & AutoprefixerOptions & BrowserslistOptions): {
    plugins: [import('postcss').PluginCreator<any>, Options[keyof Options]][];
};
//# sourceMappingURL=index.d.ts.map