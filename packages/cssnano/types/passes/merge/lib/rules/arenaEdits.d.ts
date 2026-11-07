import type { BlockRecords } from './blockRecords.js';
import type { ChainPosition } from './blockRecord.js';
import type { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { NodeEntry } from './blockRecord.js';
import type { RuleRecord } from './ruleRecord.js';
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import {ChainPosition} from './blockRecord.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {NodeEntry} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/**
 * Replaces the rule `record` with the rules `replacements`, which take its
 * place in the chain, in order.
 *
 * @param {BlockRecords} records
 * @param {number} record the index of the rule that is replaced
 * @param {number[]} replacements
 * @return {void}
 */
export declare function substitute(records: BlockRecords, record: number, replacements: number[]): void;
/**
 * Moves the rule `record` to the end of the chain of the block at `target`.
 *
 * @param {BlockRecords} records
 * @param {number} target the index of the block that takes the rule
 * @param {number} record the index of the rule
 * @return {void}
 */
export declare function moveRule(records: BlockRecords, target: number, record: number): void;
/**
 * Moves the chain of the block at `source` to the end of the chain of the
 * block at `target`. `source` is left with no children, since the caller
 * removes it. A nested block keeps its rule, which moves with the chain.
 *
 * @param {BlockRecords} records
 * @param {number} target
 * @param {number} source
 * @return {void}
 */
export declare function adopt(records: BlockRecords, target: number, source: number): void;
/**
 * Appends a child to the chain of a rule, after its last child, and gives the
 * child the whitespace of that child when it has none. The node takes it at
 * write-back. The child must be linked nowhere, or unlinked.
 *
 * @param {BlockRecords} records
 * @param {RuleRecord} rule
 * @param {DeclarationRecord | NodeEntry} child
 * @return {void}
 */
export declare function appendChild(records: BlockRecords, rule: RuleRecord, child: DeclarationRecord | NodeEntry): void;
/**
 * Removes the declarations of a rule at the positions `claimed`, which index
 * the declarations as they stand at the call. The node drops them at
 * write-back.
 *
 * @param {BlockRecords} records
 * @param {RuleRecord} rule
 * @param {Set<ChainPosition>} claimed the positions of the declarations that leave
 * @return {void}
 */
export declare function removeDeclarationsAt(records: BlockRecords, rule: RuleRecord, claimed: Set<ChainPosition>): void;
/**
 * Removes the declarations of a rule at the positions `claimed`, as
 * `removeDeclarationsAt` does, and returns their records for another rule to
 * append.
 *
 * @param {BlockRecords} records
 * @param {RuleRecord} rule
 * @param {Set<ChainPosition>} claimed the positions of the declarations that leave
 * @return {DeclarationRecord[]} the removed records, in order
 */
export declare function takeDeclarationsAt(records: BlockRecords, rule: RuleRecord, claimed: Set<ChainPosition>): DeclarationRecord[];
//# sourceMappingURL=arenaEdits.d.ts.map