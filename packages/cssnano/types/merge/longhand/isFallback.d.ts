import type { DeclarationItem } from './blockDeclarations.js';
/**
 * @param {DeclarationItem} declaration
 * @return {Set<string>} every feature a browser had to support for the
 * declaration to apply: the ones its value uses, and the ones the declaration
 * it was cloned from needed
 */
declare function requiredSupport(declaration: DeclarationItem): Set<string>;
/**
 * @param {DeclarationItem} declaration
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {boolean} whether some target may drop the declaration because it
 * lacks syntax the declaration needs
 */
declare function needsUnmetSupport(declaration: DeclarationItem, features: ReadonlySet<string>): boolean;
/**
 * @param {DeclarationItem} declaration
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {Set<string>} the support out of `requiredSupport` that stops a
 * merge
 */
declare function mergeBlockingSupport(declaration: DeclarationItem, features: ReadonlySet<string>): Set<string>;
/**
 * A later declaration requiring new support is assumed to enhance an earlier
 * one. Dropping the earlier changes rendering.
 *
 * @param {DeclarationItem} earlier
 * @param {DeclarationItem} later
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {boolean} whether earlier is a fallback for later
 */
declare function isFallback(earlier: DeclarationItem, later: DeclarationItem, features: ReadonlySet<string>): boolean;
/**
 * Author-written declarations are checked against all required support;
 * plugin-created declarations only against the features that block a merge.
 *
 * @param {DeclarationItem} earlier
 * @param {DeclarationItem} later
 * @param {ReadonlySet<string>} features the features every target supports
 * @return {boolean}
 */
declare function strandsFallback(earlier: DeclarationItem, later: DeclarationItem, features: ReadonlySet<string>): boolean;
export { requiredSupport, mergeBlockingSupport, needsUnmetSupport, isFallback, strandsFallback, };
//# sourceMappingURL=isFallback.d.ts.map