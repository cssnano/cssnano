import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { BlockRecords } from './blockRecords.js';
import { BlockRecord } from './blockRecord.js';
import type { Container, Root } from 'postcss';
import type { RuleRecord } from './ruleRecord.js';
import type { NodeEntry } from './blockRecord.js';
import type { PropertyWrites } from './propertyWrites.js';
import type MergeState from './mergeState.js';
import type { RunContext } from '../../../ir/runContext.js';
/**
 * Builds the records of a stylesheet from its tree, once per run. Each child is
 * linked into the chain of its parent, and every rule is a container whose
 * children form its own chain.
 *
 * @param {Root} root
 * @param {RunContext} context the run's state, which gives the tokens and ids the records keep
 * @return {BlockRecords}
 */
export declare function buildRecords(root: Root, context: RunContext): BlockRecords;
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
 * @param {DeclarationRecord[]} kept the declarations of `receiving`, extended in place
 * @param {PropertyWrites} index the writes of `kept`, extended in place
 * @param {RuleRecord} incoming
 * @return {void}
 */
export declare function appendToDeclarations(mergeState: MergeState, receiving: RuleRecord, kept: DeclarationRecord[], index: PropertyWrites, incoming: RuleRecord): void;
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