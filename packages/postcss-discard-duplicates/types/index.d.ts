/**
 * Structural view over the postcss node kinds compared by `equals` and its
 * helpers.
 * @typedef {{
 *   type: string,
 *   important?: boolean,
 *   raws: { before?: string, afterName?: string },
 *   selector?: string,
 *   name?: string,
 *   params?: string,
 *   prop?: string,
 *   value?: string,
 *   nodes?: import('postcss').ChildNode[],
 * }} ComparableNode
 */
export type ComparableNode = {
    type: string;
    important?: boolean;
    raws: {
        before?: string;
        afterName?: string;
    };
    selector?: string;
    name?: string;
    params?: string;
    prop?: string;
    value?: string;
    nodes?: import('postcss').ChildNode[];
};
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