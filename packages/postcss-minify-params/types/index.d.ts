import type browserslist from 'browserslist';
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
export type Options = AutoprefixerOptions & BrowserslistOptions;
/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {AutoprefixerOptions & BrowserslistOptions} Options
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(options?: {}): {
    postcssPlugin: string;
    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result: import('postcss').Result & {
        opts: BrowserslistOptions & {
            file?: string;
        };
    }): {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css: import('postcss').Root): void;
    };
};
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map