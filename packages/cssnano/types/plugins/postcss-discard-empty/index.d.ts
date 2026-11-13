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