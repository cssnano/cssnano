/**
 * @template T
 * @param {ReadonlySet<string>} supported - features every target supports
 * @param {() => T} run
 * @return {T}
 */
declare function withTargetSupport<T>(supported: ReadonlySet<string>, run: () => T): T;
/**
 * @param {import('postcss').Declaration} declaration
 * @return {Set<string>} every feature a browser had to support for the
 * declaration to apply: the ones its value uses, and the ones the declaration
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
 * @return {boolean} whether some target may drop the declaration because it
 * lacks syntax the declaration needs
 */
declare function needsUnmetSupport(declaration: import('postcss').Declaration): boolean;
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
 * Author-written declarations are checked against all required support;
 * plugin-created declarations only against the features that block a merge.
 *
 * @param {import('postcss').Declaration} earlier
 * @param {import('postcss').Declaration} later
 * @return {boolean}
 */
declare function strandsFallback(earlier: import('postcss').Declaration, later: import('postcss').Declaration): boolean;
export { requiredSupport, mergeBlockingSupport, needsUnmetSupport, inheritSupport, isFallback, strandsFallback, withTargetSupport, };
//# sourceMappingURL=isFallback.d.ts.map