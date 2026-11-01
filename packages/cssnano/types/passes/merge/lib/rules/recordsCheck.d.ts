import type { BlockRecords } from './blockRecords.js';
/**
 * Under consistency checks, throws when a slot or a nested block names the wrong
 * block or position, or a dropped block still holds a live child. Reads only
 * the records, so it needs no PostCSS node.
 *
 * @param {{records: BlockRecords}} mergeState
 * @return {void}
 */
export declare function assertRecordsWellFormed(mergeState: {
    records: BlockRecords;
}): void;
/**
 * Walks the ownership of the records from the root: the children of each block,
 * the rules of each slot, the nested block of each rule, and the declarations
 * of each rule that holds none. Throws when a block, slot, rule or declaration
 * is reached twice, since every record has one owner.
 *
 * @param {BlockRecords} records
 * @return {void}
 */
export declare function assertOwnershipIsTree(records: BlockRecords): void;
//# sourceMappingURL=recordsCheck.d.ts.map