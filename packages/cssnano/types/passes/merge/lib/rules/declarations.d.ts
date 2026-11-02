import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/**
 * Two declarations are equal when they print the same, which their ids tell:
 * the same property name, value, importance and hack prefix.
 *
 * @param {DeclarationRecord} a
 * @param {DeclarationRecord} b
 * @return {boolean}
 */
export declare function declarationIsEqual(a: DeclarationRecord, b: DeclarationRecord): boolean;
/**
 * The declarations of `declarations` whose id is in `keySet`, in their order.
 *
 * @param {DeclarationRecord[]} declarations
 * @param {Set<number>} keySet the ids of the other rule's declarations
 * @return {DeclarationRecord[]}
 */
export declare function intersect(declarations: DeclarationRecord[], keySet: Set<number>): DeclarationRecord[];
/**
 * Whether two rules hold equal declarations in the same order. Equal
 * declarations share an id, as `declarationIsEqual` states, so the ids of
 * each rule's declarations decide it.
 *
 * @param {number[]} a the ids of the declarations of a rule, in order
 * @param {number[]} b
 * @return {boolean}
 */
export declare function sameDeclarationsAndOrder(a: number[], b: number[]): boolean;
/**
 * @param {DeclarationRecord[]} hoistCandidates
 * @param {DeclarationRecord[]} earlierRuleDeclarations
 * @param {DeclarationRecord[]} laterRuleDeclarations
 * @return {{intersection: DeclarationRecord[], claimedIndices: Set<number>, claimedEarlierIndices: Set<number>}}
 */
export declare function filterRuleIntersections(hoistCandidates: DeclarationRecord[], earlierRuleDeclarations: DeclarationRecord[], laterRuleDeclarations: DeclarationRecord[]): {
    intersection: DeclarationRecord[];
    claimedIndices: Set<number>;
    claimedEarlierIndices: Set<number>;
};
//# sourceMappingURL=declarations.d.ts.map