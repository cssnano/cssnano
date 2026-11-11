import { TextTable } from '../../../../values/textTable.js';
import type { ChildNode, Container } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
import type { NodeTable } from './nodeTable.js';
import type { BlockRecord as Block } from './blockRecord.js';
import type { RuleRecord } from './ruleRecord.js';
import type { TokenLists } from '../../../ir/tokenLists.js';
/**
 * The nodes of the children the block at `index` holds now, in order.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {number} index
 * @return {ChildNode[]}
 */
export declare function childNodesOf(records: BlockRecords, nodes: NodeTable, index: number): ChildNode[];
export type ContainerRecord = Block | RuleRecord;
/** @typedef {Block | RuleRecord} ContainerRecord a block, or a rule, whose children form its chain */
/**
 * Whether the live children of a container differ from its nodes. Compares in
 * order and stops at the first difference, without a list of live children.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {ContainerRecord} block
 * @return {boolean}
 */
export declare function differs(records: BlockRecords, nodes: NodeTable, block: ContainerRecord): boolean;
export type Rebuilt = {
    container: Container;
    /**
     * the children the container takes
     */
    children: ChildNode[];
    /**
     * the whitespace the first child of a
     * root takes, or null for any other container
     */
    leading: string | null;
};
/**
 * @typedef {object} Rebuilt
 * @property {Container} container
 * @property {ChildNode[]} children the children the container takes
 * @property {string | null} leading the whitespace the first child of a
 * root takes, or null for any other container
 */
/**
 * Gives each container its children, after every container has been emptied,
 * so a child that moves between two of them keeps the parent it is given.
 *
 * @param {Rebuilt[]} rebuilt
 * @return {void}
 */
export declare function replaceChildren(rebuilt: Rebuilt[]): void;
/**
 * Walks the live tree from the root. Each rule it reaches gets its selector
 * written, and each container whose children differ from its node gets the
 * children the records hold, as does each plain rule that an edit changed the
 * children of. A container that already matches keeps its child list, and so
 * does a plain rule that no edit touched. A record the root does not reach,
 * dropped, keeps its node as it is, and a merged rule the root
 * does not reach gets none.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes the node of each entry, from the build; write-back adds the merged rules' nodes
 * @param {TokenLists} tokenLists the run's token lists, which the ids of the rules name
 * @param {TextTable} [textTable] the table the selectors are written through
 * @return {void}
 */
export declare function writeBack(records: BlockRecords, nodes: NodeTable, tokenLists: TokenLists, textTable?: TextTable): void;
//# sourceMappingURL=writeBack.d.ts.map