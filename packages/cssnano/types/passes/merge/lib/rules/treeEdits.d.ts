import { BlockRecord, BlockRecords } from './blockRecords.js';
import { RuleRecord } from './ruleRecord.js';
import type { Container, Root } from 'postcss';
import type { PropertyWrites } from './lastWriteIndex.js';
import type MergeState from './mergeState.js';
/**
 * Builds the records of a stylesheet from its tree, once per run. Each rule
 * gets a slot, and each rule that holds a rule or an at-rule gets the record
 * of its children.
 *
 * @param {Root} root
 * @param {MergeState} mergeState
 * @return {BlockRecords}
 */
export declare function buildRecords(root: Root, mergeState: MergeState): BlockRecords;
/**
 * Takes a rule or an at-rule out of its parent's records at once. The PostCSS
 * child list catches up at write-back.
 *
 * @param {RuleRecord | BlockRecord} entry the record of the rule, or the block of the at-rule
 * @return {void}
 */
export declare function remove(entry: RuleRecord | BlockRecord): void;
/**
 * Moves `earlier`, which already holds the joined content, to the place of
 * `later`, so the joined node takes the later position and keeps the
 * whitespace before `later`.
 *
 * @param {MergeState} mergeState
 * @param {Container} parent
 * @param {RuleRecord | BlockRecord} earlier the record of a rule, or the block of an at-rule
 * @param {RuleRecord | BlockRecord} later the record of a rule, or the block of an at-rule, of the same kind
 * @return {void}
 */
export declare function takePlaceOf(mergeState: MergeState, parent: Container, earlier: RuleRecord | BlockRecord, later: RuleRecord | BlockRecord): void;
/**
 * Appends the children of `incoming` to `receiving`, comments included. A
 * declaration of `incoming` is redundant only when the last declaration of
 * `receiving` that can set the same property already has an identical value.
 * Otherwise it revives an overridden value or overrides intermediate
 * declarations, so appending it is required to preserve the cascade result.
 *
 * @param {MergeState} mergeState
 * @param {RuleRecord} receiving
 * @param {PropertyWrites} index the writes of the declarations of `receiving`, extended in place
 * @param {RuleRecord} incoming
 * @return {void}
 */
export declare function appendToDeclarations(mergeState: MergeState, receiving: RuleRecord, index: PropertyWrites, incoming: RuleRecord): void;
/**
 * Removes `records` from the records of their parent. The PostCSS child list
 * catches up at write-back.
 *
 * @param {MergeState} mergeState
 * @param {Set<RuleRecord>} records
 * @return {void}
 */
export declare function removeRules(mergeState: MergeState, records: Set<RuleRecord>): void;
//# sourceMappingURL=treeEdits.d.ts.map