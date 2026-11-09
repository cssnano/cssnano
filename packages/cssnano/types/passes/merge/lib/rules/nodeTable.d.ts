import type { ChildNode, Container, Root } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
export type NodeTable = (Root | ChildNode | undefined)[];
/** @import {ChildNode, Container, Root, Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/**
 * The PostCSS node of each entry, by the entry's arena index. The build fills
 * a slot for each entry it makes; write-back pushes a slot for each merged rule
 * it creates a node for. Nothing clears a slot.
 *
 * @typedef {(Root | ChildNode | undefined)[]} NodeTable
 */
/**
 * The node of the entry at `index`, or undefined past the end of the table and
 * for a merged rule that write-back has not reached.
 *
 * @param {NodeTable} nodes
 * @param {number} index
 * @return {Root | ChildNode | undefined}
 */
export declare function nodeOf(nodes: NodeTable, index: number): Root | ChildNode | undefined;
/**
 * Gives each merged rule among the children of a rebuilt container its node,
 * with the template's source. Write-back fills the rest.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {number} container the index of the rebuilt container
 * @return {void}
 */
export declare function createChildNodes(records: BlockRecords, nodes: NodeTable, container: number): void;
/**
 * Adds the node of each rule a merge created that write-back has given one, in
 * arena order, which is the order the merges made them.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {Set<Container>} reported
 * @return {void}
 */
export declare function addMergedNodes(records: BlockRecords, nodes: NodeTable, reported: Set<Container>): void;
//# sourceMappingURL=nodeTable.d.ts.map