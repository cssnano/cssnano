export = pluginCreator;
/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {AutoprefixerOptions & BrowserslistOptions} Options
 */
/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import("postcss").Plugin;
declare namespace pluginCreator {
    export { postcss, AutoprefixerOptions, BrowserslistOptions, Options, RuleMeta };
}
declare var postcss: true;
type AutoprefixerOptions = {
    overrideBrowserslist?: string | string[];
};
type BrowserslistOptions = Pick<browserslist.Options, "stats" | "path" | "env">;
type Options = AutoprefixerOptions & BrowserslistOptions;
/**
 * RuleMeta stores metadata about a `Rule` during the merging process.
 * It tracks selectors and declarations without re-parsing the AST many times.
 */
type RuleMeta = {
    /**
     * - Array of selector strings for the rule
     */
    selectors: string[];
    /**
     * - Array of declaration nodes for the rule
     */
    declarations: import("postcss").Declaration[];
    /**
     * - Whether the rule has any child rule or atrule
     */
    hasContainer: boolean;
    /**
     * - Whether the selectors have been modified and need flushing
     */
    dirty: boolean;
};
import browserslist = require("browserslist");
//# sourceMappingURL=index.d.ts.map