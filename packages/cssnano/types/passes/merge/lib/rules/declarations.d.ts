import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { BlockRecords } from '../../../ir/blockRecords.js';
import type { ArenaIndex } from '../../../ir/blockRecord.js';
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {BlockRecords} from '../../../ir/blockRecords.js' */
/** @import {ArenaIndex, ChainPosition} from '../../../ir/blockRecord.js' */
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
 * @param {ReadonlySet<number>} keySet the ids of the other rule's declarations
 * @return {DeclarationRecord[]}
 */
export declare function intersect(declarations: DeclarationRecord[], keySet: ReadonlySet<number>): DeclarationRecord[];
/**
 * Whether two rules hold equal declarations in the same order. Equal
 * declarations share an id, as `declarationIsEqual` states, so the ids of
 * each rule's declarations decide it.
 *
 * @param {BlockRecords} records the arena that holds both rules' declarations
 * @param {readonly ArenaIndex[]} a the declarations of a rule, in order
 * @param {readonly ArenaIndex[]} b
 * @return {boolean}
 */
export declare function sameDeclarationsAndOrder(records: BlockRecords, a: readonly ArenaIndex[], b: readonly ArenaIndex[]): boolean;
/**
 * @param {DeclarationRecord[]} hoistCandidates in the earlier rule's chain order
 * @param {DeclarationRecord[]} earlierRuleDeclarations
 * @param {DeclarationRecord[]} laterRuleDeclarations
 * @return {{intersection: DeclarationRecord[], claimedIndices: Set<ArenaIndex>}}
 * `intersection` lists the surviving declarations in the earlier rule's chain
 * order, and `claimedIndices` the arena indices of the later rule's declarations
 * that they claim
 */
export declare function filterRuleIntersections(hoistCandidates: DeclarationRecord[], earlierRuleDeclarations: DeclarationRecord[], laterRuleDeclarations: DeclarationRecord[]): {
    intersection: DeclarationRecord[];
    claimedIndices: Set<ArenaIndex>;
};
//# sourceMappingURL=declarations.d.ts.map