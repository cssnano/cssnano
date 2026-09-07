import type browserslist from 'browserslist';
export type RuleMeta = {
    /**
     * - Array of selector strings for the rule
     */
    selectors: string[];
    /**
     * - Array of declaration nodes for the rule
     */
    declarations: import('postcss').Declaration[];
    /**
     * - Whether the selectors have been modified and need flushing
     */
    dirty: boolean;
};
export type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
export type BrowserslistOptions = Pick<browserslist.Options, 'stats' | 'path' | 'env'>;
export type Options = AutoprefixerOptions & BrowserslistOptions;
/** @import browserslist from 'browserslist' */
/**
 * @typedef {Object} RuleMeta
 * @property {string[]} selectors - Array of selector strings for the rule
 * @property {import('postcss').Declaration[]} declarations - Array of declaration nodes for the rule
 * @property {boolean} dirty - Whether the selectors have been modified and need flushing
 */
/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {AutoprefixerOptions & BrowserslistOptions} Options
 */
/** @param {Options} opts @return {import('postcss').Plugin} */
declare function pluginCreator(opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map