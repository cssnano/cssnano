import type { BlockRecords } from './blockRecords.js';
/**
 * Under consistency checks, throws when the records and the tree disagree:
 * each container must hold the nodes it holds, in order, and each rule must
 * stand in the slot its record names. Writes nothing.
 *
 * @param {BlockRecords} records
 * @return {void}
 */
export declare function assertRecordsMatchTree(records: BlockRecords): void;
//# sourceMappingURL=treeMatch.d.ts.map