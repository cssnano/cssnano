import type { ChildNode } from 'postcss';
import type { BlockRecords } from './blockRecords.js';
import type { NodeEntry } from './blockRecord.js';
import type { RuleRecord } from './ruleRecord.js';
/** @import {ChildNode} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {NodeEntry, ArenaIndex} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
import { BlockRecord } from './blockRecord.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
/**
 * The first declaration the container at `index` holds now.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that the arena gave, of a container
 * @return {DeclarationRecord | undefined}
 */
export declare function firstDeclaration(records: BlockRecords, index: number): DeclarationRecord | undefined;
/**
 * The declaration after `declaration` in its chain.
 *
 * @param {BlockRecords} records
 * @param {DeclarationRecord} declaration a declaration linked in a chain
 * @return {DeclarationRecord | undefined}
 */
export declare function nextDeclaration(records: BlockRecords, declaration: DeclarationRecord): DeclarationRecord | undefined;
/**
 * The records of every block the run added, dropped ones included.
 *
 * @param {BlockRecords} records
 * @return {Generator<BlockRecord>}
 */
export declare function blocks(records: BlockRecords): Generator<BlockRecord>;
/**
 * The records of every container the run added that holds children: each
 * block, and each rule that nests. Dropped and departed ones included.
 *
 * @param {BlockRecords} records
 * @return {Generator<BlockRecord | RuleRecord>}
 */
export declare function containers(records: BlockRecords): Generator<BlockRecord | RuleRecord>;
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
 * @param {{before: string | null}} child the record of the appended child
 * @param {{before: string | null} | undefined} last the record of the child before `child`
 * @return {void}
 */
export declare function inheritWhitespace(child: {
    before: string | null;
}, last: {
    before: string | null;
} | undefined): void;
//# sourceMappingURL=blockChildren.d.ts.map