export type Options = {
    /**
     * Adds a `@charset` when the file has non-ASCII characters and no charset. (default: true; the default preset sets false)
     */
    add?: boolean;
};
export type CharsetScan = {
    first: import('postcss').AtRule | undefined;
    charsets: import('postcss').AtRule[];
    nonAscii: import('postcss').AnyNode | undefined;
};
/**
 * @typedef {object} Options
 * @property {boolean} [add] Adds a `@charset` when the file has non-ASCII characters and no charset. (default: true; the default preset sets false)
 */
/**
 * What the charset decision reads from a walk: the first `@charset`, every
 * top-level `@charset`, in visit order, and the first top-level node with
 * non-ASCII text.
 * @typedef {object} CharsetScan
 * @property {import('postcss').AtRule | undefined} first
 * @property {import('postcss').AtRule[]} charsets
 * @property {import('postcss').AnyNode | undefined} nonAscii
 */
/**
 * Records what the charset decision needs from one node. A nested `@charset`
 * is removed as it is visited, so a walk that discards empty containers after
 * their children also discards one that held only a charset.
 *
 * @param {import('postcss').AnyNode} node
 * @param {CharsetScan} scan
 * @return {void}
 */
export declare function charsetVisit(node: import('postcss').AnyNode, scan: CharsetScan): void;
/**
 * Removes the top-level charsets. A stylesheet with non-ASCII text keeps the
 * first charset at the top, or adds one when `add` is set. The separator
 * after the first charset is read before the removal, from raws the walk
 * already normalized.
 *
 * @param {import('postcss').Root} css
 * @param {CharsetScan} scan
 * @param {Options} opts
 * @return {void}
 */
export declare function decideCharset(css: import('postcss').Root, scan: CharsetScan, opts: Options): void;
/**
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