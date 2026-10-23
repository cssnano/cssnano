/**
 * Removes the duplicate selectors of one rule, keeping its raw formatting.
 *
 * @param {import('postcss').Rule} nodes
 * @return {void}
 */
export declare function uniqueRuleSelector(nodes: import('postcss').Rule): void;
/**
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map