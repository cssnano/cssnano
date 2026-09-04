export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<import('browserslist').Options, 'stats' | 'path' | 'env'>;
export type Options = {
    sort?: boolean;
    convertToIs?: boolean;
} & AutoprefixerOptions & BrowserslistOptions;
/** @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions */
/** @typedef {Pick<import('browserslist').Options, 'stats' | 'path' | 'env'>} BrowserslistOptions */
/** @typedef {{ sort?: boolean, convertToIs?: boolean } & AutoprefixerOptions & BrowserslistOptions} Options */
/**
 * Minify selectors from tokenizer spans. Function arguments are normalized
 * bottom-up without recursive descent.
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map