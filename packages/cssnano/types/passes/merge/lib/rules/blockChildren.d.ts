import type { ChildNode } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { RuleRecord } from './ruleRecord.js';
import type { BlockRecord } from './blockRecord.js';
/**
 * The first child the block at `index` holds now, without copying the child
 * list.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {ChildNode | undefined}
 */
/**
 * The number of children the block at `index` holds now. The chain keeps the
 * count, so the answer costs no walk.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {number}
 */
export declare function liveCount(records: BlockRecords, index: number): number;
/**
 * The entries the block at `index` holds now, in order: the record of each
 * rule, the record of each at-rule block, the record of each declaration, and
 * the node of each bare node.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {(RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[]}
 */
export declare function liveEntries(records: BlockRecords, index: number): (RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[];
/**
 * The children the block at `index` holds now, in order: the node of each
 * entry of its chain.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {ChildNode[]}
 */
export declare function liveChildren(records: BlockRecords, index: number): ChildNode[];
/**
 * Gives an appended child the whitespace of the last child when it has none, as
 * PostCSS gives it, so the records keep what the node will print.
 *
 * @param {ChildNode} node
 * @param {ChildNode | undefined} last the child before `node`
 * @return {void}
 */
export declare function inheritWhitespace(node: ChildNode, last: ChildNode | undefined): void;
//# sourceMappingURL=blockChildren.d.ts.map