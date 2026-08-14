declare const _exports: {
    requiredSupport: typeof requiredSupport;
    mergeBlockingSupport: typeof mergeBlockingSupport;
    inheritSupport: typeof inheritSupport;
    isFallback: typeof isFallback;
    strandsFallback: typeof strandsFallback;
};
export = _exports;
/**
 * @param {import('postcss').Declaration} declaration
 * @return {Set<string>} every function a browser had to support for the
 * declaration to apply: the ones its value calls, and the ones the declaration
 * it was cloned from needed
 */
declare function requiredSupport(declaration: import('postcss').Declaration): Set<string>;
/**
 * @param {import('postcss').Declaration} source
 * @param {import('postcss').Declaration} clone taken from source
 * @return {void}
 */
declare function inheritSupport(source: import('postcss').Declaration, clone: import('postcss').Declaration): void;
/**
 * @param {import('postcss').Declaration} declaration
 * @return {Set<string>} the support out of `requiredSupport` that stops a
 * merge
 */
declare function mergeBlockingSupport(declaration: import('postcss').Declaration): Set<string>;
/**
 * A later declaration requiring new support is assumed to enhance an earlier
 * one. Dropping the earlier changes rendering.
 *
 * @param {import('postcss').Declaration} earlier
 * @param {import('postcss').Declaration} later
 * @return {boolean} whether earlier is a fallback for later
 */
declare function isFallback(earlier: import('postcss').Declaration, later: import('postcss').Declaration): boolean;
/**
 * Author-written declarations are checked against all support-dependent
 * functions; plugin-created declarations only against the merge-sensitive
 * ones.
 *
 * @param {import('postcss').Declaration} earlier
 * @param {import('postcss').Declaration} later
 * @return {boolean}
 */
declare function strandsFallback(earlier: import('postcss').Declaration, later: import('postcss').Declaration): boolean;
//# sourceMappingURL=isFallback.d.ts.map