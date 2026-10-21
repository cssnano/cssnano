import type { PropertyTable } from '../../../ir/propertyTable.js';
import type { Declaration } from 'postcss';
/** @import {Declaration} from 'postcss' */
/**
 * @param {Declaration} a
 * @param {Declaration} b
 * @return {boolean}
 */
export declare function declarationIsEqual(a: Declaration, b: Declaration): boolean;
/**
 * The declarations of `declarations` whose key is in `keySet`, in their order.
 *
 * @param {Declaration[]} declarations
 * @param {Set<number>} keySet the keys of the other rule's declarations
 * @param {(declaration: Declaration) => number} keyOf
 * @return {Declaration[]}
 */
export declare function intersect(declarations: Declaration[], keySet: Set<number>, keyOf: (declaration: Declaration) => number): Declaration[];
/**
 * @param {Declaration[]} a
 * @param {Declaration[]} b
 * @return {boolean}
 */
export declare function sameDeclarationsAndOrder(a: Declaration[], b: Declaration[]): boolean;
/**
 * @param {Declaration[]} hoistCandidates
 * @param {Declaration[]} earlierRuleDeclarations
 * @param {Declaration[]} laterRuleDeclarations
 * @param {PropertyTable} table
 * @return {{intersection: Declaration[], claimedIndices: Set<number>, claimedEarlierIndices: Set<number>}}
 */
export declare function filterRuleIntersections(hoistCandidates: Declaration[], earlierRuleDeclarations: Declaration[], laterRuleDeclarations: Declaration[], table: PropertyTable): {
    intersection: Declaration[];
    claimedIndices: Set<number>;
    claimedEarlierIndices: Set<number>;
};
//# sourceMappingURL=declarations.d.ts.map