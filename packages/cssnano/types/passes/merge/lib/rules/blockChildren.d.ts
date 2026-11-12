import type { BlockRecords } from './blockRecords.js';
import type { ArenaIndex, BlockRecord, NodeEntry } from './blockRecord.js';
import type { RuleRecord } from './ruleRecord.js';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
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
 * block, and each rule that nests. Dropped ones included.
 *
 * @param {BlockRecords} records
 * @return {Generator<BlockRecord | RuleRecord>}
 */
export declare function containers(records: BlockRecords): Generator<BlockRecord | RuleRecord>;
/**
 * The children the rule at `index` holds now, comments included. A comment there
 * says the output depends on it: a rule with a comment is kept as written.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that the arena gave
 * @return {number}
 */
export declare function childCountOf(records: BlockRecords, index: number): number;
/**
 * Whether the rule at `index` holds only declarations, as an empty rule does
 * when it holds no other child.
 *
 * @param {BlockRecords} records
 * @param {number} index an index that the arena gave
 * @return {boolean}
 */
export declare function holdsOnlyDeclarationsOf(records: BlockRecords, index: number): boolean;
/**
 * The entries the block at `index` holds now, in order: the record of each
 * rule, the record of each at-rule block, the record of each declaration, and
 * the record of each bare node.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {(RuleRecord | BlockRecord | DeclarationRecord | NodeEntry)[]}
 */
export declare function childEntriesOf(records: BlockRecords, index: number): (RuleRecord | BlockRecord | DeclarationRecord | NodeEntry)[];
/**
 * Gives an appended child the whitespace of the last child when it has none, as
 * PostCSS gives it, so the records keep what the node will print.
 *
 * @param {BlockRecords} records the arena that holds both children
 * @param {ArenaIndex} child the index of the appended child
 * @param {ArenaIndex | -1} last the index of the child before `child`, or -1 for none
 * @return {void}
 */
export declare function inheritWhitespace(records: BlockRecords, child: ArenaIndex, last: ArenaIndex | -1): void;
/**
 * The declarations of the rule at `index`, in order, read from its chain at the
 * call. A reader that indexes them by position takes this array.
 *
 * @param {BlockRecords} records the arena that holds the rule's children
 * @param {number} index the rule's index
 * @return {DeclarationRecord[]}
 */
export declare function declarationsOf(records: BlockRecords, index: number): DeclarationRecord[];
//# sourceMappingURL=blockChildren.d.ts.map