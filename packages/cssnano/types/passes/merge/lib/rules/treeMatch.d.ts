import type { BlockRecords } from './blockRecords.js';
import type { NodeTable } from './nodeTable.js';
/**
 * Under consistency checks, throws when the records and the tree disagree:
 * each container must hold the nodes it holds, in order, and each rule must
 * stand in the slot its record names. Writes nothing.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @return {void}
 */
export declare function assertRecordsMatchTree(records: BlockRecords, nodes: NodeTable): void;
//# sourceMappingURL=treeMatch.d.ts.map