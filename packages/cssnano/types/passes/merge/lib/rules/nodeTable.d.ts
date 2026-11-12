import type { ChildNode, Root } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
import type { TokenLists } from '../../../ir/tokenLists.js';
export type NodeTable = (Root | ChildNode | undefined)[];
/** @import {ChildNode, Root} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {TokenLists} from '../../../ir/tokenLists.js' */
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
 * Gives each child of a rebuilt container that has no node its node: a merged
 * rule gets one with the template's source, and an appended declaration gets
 * one from its record. Write-back fills the rest.
 *
 * @param {BlockRecords} records
 * @param {NodeTable} nodes
 * @param {number} container the index of the rebuilt container
 * @param {TokenLists} tokenLists the run's token lists, which the declarations' values name
 * @return {void}
 */
export declare function createChildNodes(records: BlockRecords, nodes: NodeTable, container: number, tokenLists: TokenLists): void;
//# sourceMappingURL=nodeTable.d.ts.map