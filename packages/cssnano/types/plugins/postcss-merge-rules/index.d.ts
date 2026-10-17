export type RuleMeta = {
    /**
     * - Array of selector strings for the rule
     */
    selectors: string[];
    /**
     * - Array of declaration nodes for the rule
     */
    declarations: import('postcss').Declaration[];
};
export type Options = object;
/**
 * @typedef {Object} RuleMeta
 * @property {string[]} selectors - Array of selector strings for the rule
 * @property {import('postcss').Declaration[]} declarations - Array of declaration nodes for the rule
 */
/**
 * @typedef {object} Options
 */
/** @param {Options} opts @return {import('postcss').Plugin} */
declare function pluginCreator(opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map