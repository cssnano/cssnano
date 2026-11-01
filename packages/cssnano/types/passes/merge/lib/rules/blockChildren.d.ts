import type { ChildNode } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { BlockRecord } from './blockRecord.js';
import type { RuleRecord } from './ruleRecord.js';
/**
 * The first child the block at `index` holds now, without copying the child
 * list.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {ChildNode | undefined}
 */
export declare function firstLiveChild(records: BlockRecords, index: number): ChildNode | undefined;
/**
 * The number of children the block at `index` holds now, counted without
 * copying them.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {number}
 */
export declare function liveCount(records: BlockRecords, index: number): number;
/**
 * The entries the block at `index` holds now, in order: the record of each
 * rule, the record of each at-rule block, the record of each declaration, and
 * the node of each bare node. A block that was dropped is left out.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {(RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[]}
 */
export declare function liveEntries(records: BlockRecords, index: number): (RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[];
/**
 * The children the block at `index` holds now, in order: the rules of its
 * slots, and the nodes of its other entries, except a block that was dropped.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {ChildNode[]}
 */
export declare function liveChildren(records: BlockRecords, index: number): ChildNode[];
//# sourceMappingURL=blockChildren.d.ts.map