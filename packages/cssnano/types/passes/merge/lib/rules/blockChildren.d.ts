/** @import {ChildNode} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {NodeEntry} from './blockRecord.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import {RuleRecord as Rule} from './ruleRecord.js' */
import type { ChildNode } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
import type { NodeEntry } from './blockRecord.js';
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
 * the record of each bare node.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {(RuleRecord | BlockRecord | DeclarationRecord | NodeEntry)[]}
 */
export declare function liveEntries(records: BlockRecords, index: number): (RuleRecord | BlockRecord | DeclarationRecord | NodeEntry)[];
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
 * @param {{before: string | undefined}} child the record of the appended child
 * @param {{before: string | undefined} | undefined} last the record of the child before `child`
 * @return {void}
 */
export declare function inheritWhitespace(child: {
    before: string | undefined;
}, last: {
    before: string | undefined;
} | undefined): void;
//# sourceMappingURL=blockChildren.d.ts.map