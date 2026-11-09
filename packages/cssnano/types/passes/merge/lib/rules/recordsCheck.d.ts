import type { BlockRecords } from './blockRecords.js';
import type { BlockRecord } from './blockRecord.js';
import type { RuleRecord } from './ruleRecord.js';
import type MergeState from './mergeState.js';
export type Container = BlockRecord | RuleRecord;
/**
 * Under consistency checks, throws when a chain is out of step with its
 * entries or a record is reached twice. Only what the root reaches is checked:
 * a removed block may keep its entries, and write-back never reads them.
 * Reads only the records, so it needs no PostCSS node.
 *
 * @param {{records: BlockRecords}} mergeState
 * @return {void}
 */
export declare function assertRecordsWellFormed(mergeState: {
    records: BlockRecords;
}): void;
/**
 * Walks the ownership of the records from the root along the chains: the
 * entries of each block, and the chain of each rule.
 * Throws when a block, rule or declaration is reached twice, since every record
 * has one owner, or when a chain holds other than the count its block keeps.
 *
 * @param {BlockRecords} records
 * @return {void}
 */
export declare function assertOwnershipIsTree(records: BlockRecords): void;
/**
 * Under consistency checks, throws when a block's context differs from the one
 * its prelude and its enclosing block give it now. A context is assigned once,
 * at the build, so a move that crossed into an unequal container would leave
 * it stale.
 *
 * @param {MergeState} mergeState
 * @return {void}
 */
export declare function assertContextsCurrent(mergeState: MergeState): void;
//# sourceMappingURL=recordsCheck.d.ts.map