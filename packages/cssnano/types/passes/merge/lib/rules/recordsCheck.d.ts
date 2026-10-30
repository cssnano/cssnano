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
//# sourceMappingURL=recordsCheck.d.ts.map