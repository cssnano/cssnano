import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import type { BlockRecords } from './blockRecords.js';
import type { BlockRecord, NodeEntry } from './blockRecord.js';
import type { RuleRecord } from './ruleRecord.js';
import type { ArenaIndex } from './blockRecord.js';
import type MergeState from './mergeState.js';
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import MergeState from './mergeState.js' */
/** @import {RunContext} from '../../../ir/runContext.js' */
/**
 * The edits that rule merging makes to the records of the stylesheet. Each one
 * updates the records it touches, so a join cannot leave a stale answer
 * behind. The PostCSS nodes catch up at write-back, which rebuilds the child
 * lists that changed. Lib code outside this module edits through these names.
 */
/**
 * Takes an entry out of its parent's records at once. The PostCSS child list
 * catches up at write-back.
 *
 * @param {BlockRecords} records
 * @param {RuleRecord | BlockRecord | DeclarationRecord | NodeEntry} entry the record of the rule, the block of the at-rule, or another entry
 * @return {void}
 */
export declare function remove(records: BlockRecords, entry: RuleRecord | BlockRecord | DeclarationRecord | NodeEntry): void;
/**
 * Moves the entry `earlier`, which already holds the joined content, to the
 * place of `later`, so the joined node takes the later position and keeps the
 * whitespace before `later`.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} earlier the index of a rule, or of the block of an at-rule
 * @param {ArenaIndex} later the index of a rule, or of the block of an at-rule, of the same kind
 * @return {void}
 */
export declare function takePlaceOf(records: BlockRecords, earlier: ArenaIndex, later: ArenaIndex): void;
/**
 * Appends the children of `incoming` to `receiving`, comments included. A
 * declaration of `incoming` is redundant only when the last declaration of
 * `receiving` that can set the same property already has an identical value.
 * Otherwise it revives an overridden value or overrides intermediate
 * declarations, so appending it is required to preserve the cascade result.
 *
 * Each pass reads the declarations of `receiving` before its duplicate test,
 * so a pass sees the appends before it. The loop's only edit of `receiving` is
 * appendChild, which keeps the entry fresh, so only the first read of a merge
 * can rebuild it.
 *
 * @param {MergeState} mergeState
 * @param {ArenaIndex} receiving
 * @param {ArenaIndex} incoming
 * @return {void}
 */
export declare function appendToDeclarations(mergeState: MergeState, receiving: ArenaIndex, incoming: ArenaIndex): void;
/**
 * Removes `records` from the records of their parent. The PostCSS child list
 * catches up at write-back.
 *
 * @param {MergeState} mergeState
 * @param {Set<number>} indices the indices of the rules to remove
 * @return {void}
 */
export declare function removeRules(mergeState: MergeState, indices: Set<number>): void;
//# sourceMappingURL=treeEdits.d.ts.map