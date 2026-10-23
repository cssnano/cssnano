/**
 * An empty `@layer x{}` is redundant only when an earlier block or statement
 * already fixed the order of `x`. Every ancestor other than `@layer` is
 * treated as a condition, so an earlier declaration counts only at top level
 * or under a condition that also encloses the later block.
 *
 * @param {import('postcss').Root} css
 * @param {import('postcss').Result} result
 * @return {void}
 */
export declare function discardAndReport(css: import('postcss').Root, result: import('postcss').Result): void;
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