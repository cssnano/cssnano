/**
 * An empty `@layer x{}` is redundant only when an earlier block or statement
 * already fixed the order of `x`. Every ancestor other than `@layer` is
 * treated as a condition, so an earlier declaration counts only at top level
 * or under a condition that also encloses the later block. `visit` runs on
 * each node that is kept, after its children, so another per-node transform
 * can share this walk.
 *
 * @param {import('postcss').Root} css
 * @param {import('postcss').Result} result
 * @param {((node: import('postcss').AnyNode) => void) | undefined} visit
 * @param {import('../../values/textTable.js').TextTable} table the text table
 *   the walk stored, which gives each layer's names
 * @return {void}
 */
export declare function discardAndReport(css: import('postcss').Root, result: import('postcss').Result, visit: ((node: import('postcss').AnyNode) => void) | undefined, table: import('../../values/textTable.js').TextTable): void;
/**
 * Removes a node that a transform after the walk no longer needs, then each
 * ancestor the removal empties, so no parent the walk passed stays empty. An
 * emptied named `@layer` stays: it may fix the order of its layer.
 *
 * @param {import('postcss').ChildNode} node
 * @param {import('postcss').Result} result
 * @return {void}
 */
export declare function removeAndDiscardEmptied(node: import('postcss').ChildNode, result: import('postcss').Result): void;
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