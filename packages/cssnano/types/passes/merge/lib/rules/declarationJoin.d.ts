import { RuleRecord } from './ruleRecord.js';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type MergeState from './mergeState.js';
import type { ArenaIndex, BlockRecord, ChainPosition } from './blockRecord.js';
import type { BlockRecords } from './blockRecords.js';
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {ChildNode, Rule} from 'postcss' */
/** @import MergeState from './mergeState.js' */
/** @import {ArenaIndex, BlockRecord, ChainPosition} from './blockRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/**
 * A rule made only of declarations. Comments and nested rules would be
 * stranded or reordered by moving declarations out of the rule.
 *
 * @param {BlockRecords} records the arena that holds the rule's children
 * @param {RuleRecord} record
 * @return {boolean}
 */
export declare const isDeclarationRule: (records: BlockRecords, record: RuleRecord) => boolean;
/**
 * The arena indices of the declarations in `later` that repeat every one of
 * `declarations`, or null when a repeat does not stand first for its
 * property, since removing it would then change what `later` sets.
 *
 * @param {DeclarationRecord[]} declarations
 * @param {DeclarationRecord[]} later
 * @return {Set<ArenaIndex> | null} the arena indices of the later declarations
 */
export declare function claimRepeats(declarations: DeclarationRecord[], later: DeclarationRecord[]): Set<ArenaIndex> | null;
export type Group = {
    rule: RuleRecord;
    /**
     * its place among the live entries of the block
     */
    position: ChainPosition;
    declarations: DeclarationRecord[];
    /**
     * the ids of the listed selectors, built on demand
     */
    selectors: Set<number> | null;
    /**
     * declaration bytes, each with its separator, or -1
     */
    bytes: number;
};
/**
 * A later rule that repeats all declarations of an earlier rule adds its
 * selectors to that rule, and gives up the repeated declarations, when no
 * node between them sets a property they also set: the earlier rule then
 * applies the declarations to the same elements as before. The earlier
 * rule, the group, keeps its position and its declarations, so it can take
 * further rules.
 *
 * @param {BlockRecord} block
 * @param {MergeState} mergeState
 * @return {boolean}
 */
export default function joinByDeclarations(block: BlockRecord, mergeState: MergeState): boolean;
//# sourceMappingURL=declarationJoin.d.ts.map