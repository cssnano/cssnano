import type { DeclarationItem } from './blockDeclarations.js';
/**
 * @param {import('postcss').Declaration} node
 * @return {ReadonlySet<string> | null} the support the clone needed, or `null`
 * for a declaration the author wrote
 */
export declare function inheritedSupportOf(node: import('postcss').Declaration): ReadonlySet<string> | null;
/**
 * @param {import('postcss').Declaration} node a clone the plugin made
 * @param {ReadonlySet<string>} support the support the clone needed
 * @return {void}
 */
export declare function setInheritedSupport(node: import('postcss').Declaration, support: ReadonlySet<string>): void;
/**
 * @param {DeclarationItem} declaration
 * @return {Set<string>} every feature a browser had to support for the
 * declaration to apply: the ones its value uses, and the ones the declaration
 * it was cloned from needed
 */
declare function requiredSupport(declaration: DeclarationItem): Set<string>;
/**
 * A declaration the plugin cloned carries its own support requirement, which
 * values alone cannot recover. An author-written declaration has none, so its
 * presence tells that the plugin created the declaration. Values the plugin
 * invented, such as `currentcolor` standing for `border: medium none`, cannot
 * be fallbacks the author wrote.
 *
 * @param {DeclarationItem} declaration
 * @return {boolean} whether the plugin created the declaration
 */
declare function isDerived(declaration: DeclarationItem): boolean;
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
export { requiredSupport, mergeBlockingSupport, needsUnmetSupport, isDerived, isFallback, strandsFallback, };
//# sourceMappingURL=isFallback.d.ts.map