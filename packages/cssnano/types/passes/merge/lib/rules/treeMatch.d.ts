import type { BlockRecords } from './blockRecords.js';
import type { NodeTable } from './nodeTable.js';
import type { TokenLists } from '../../../ir/tokenLists.js';
/**
 * Under consistency checks, throws when the records and the tree disagree:
 * each container must hold the nodes it holds, in order, each rule must
 * stand in the slot its record names, and its selectors must spell the tree's.
 * Writes nothing.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {TokenLists} tokenLists the run's token lists, which the ids name
 * @return {void}
 */
export declare function assertRecordsMatchTree(records: BlockRecords, nodes: NodeTable, tokenLists: TokenLists): void;
//# sourceMappingURL=treeMatch.d.ts.map