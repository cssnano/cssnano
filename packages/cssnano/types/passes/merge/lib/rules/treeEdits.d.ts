import { BlockRecord, BlockRecords } from './blockRecords.js';
import { RuleRecord } from './ruleRecord.js';
import type { Container, Declaration, Root } from 'postcss';
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
 * Appends the children of `from` to `into`, after its own, in the records. The
 * PostCSS child lists catch up at write-back. `from` is left empty, so the
 * caller removes or replaces it.
 *
 * @param {BlockRecord} into
 * @param {BlockRecord} from
 * @return {void}
 */
export declare function moveChildren(into: BlockRecord, from: BlockRecord): void;
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
 * Appends the content of `incoming` to `receiving`. A declaration of
 * `incoming` is redundant only when the last declaration of `receiving` that
 * can set the same property already has an identical value. Otherwise it
 * revives an overridden value or overrides intermediate declarations, so
 * appending it is required to preserve the cascade result.
 *
 * @param {MergeState} mergeState
 * @param {RuleRecord} receiving
 * @param {Declaration[]} kept the declarations of `receiving`, extended in place
 * @param {PropertyWrites} index the writes of `kept`, extended in place
 * @param {RuleRecord} incoming
 * @return {void}
 */
export declare function appendToDeclarations(mergeState: MergeState, receiving: RuleRecord, kept: Declaration[], index: PropertyWrites, incoming: RuleRecord): void;
/**
 * Removes `declarations` from `record`'s rule, which keeps the others.
 *
 * @param {MergeState} mergeState
 * @param {RuleRecord} record
 * @param {Declaration[]} declarations
 * @return {void}
 */
export declare function removeDeclarations(mergeState: MergeState, record: RuleRecord, declarations: Declaration[]): void;
/**
 * Removes `records` from the records of their parent. The PostCSS child list
 * catches up at write-back.
 *
 * @param {MergeState} mergeState
 * @param {Set<RuleRecord>} records
 * @return {void}
 */
export declare function removeRules(mergeState: MergeState, records: Set<RuleRecord>): void;
/**
 * Marks a rule that a placement drops as departed. The rule leaves the tree
 * when `replaceChildren` applies the placement, and reading its record throws
 * from now on.
 *
 * @param {MergeState} mergeState
 * @param {RuleRecord} record
 * @return {void}
 */
export declare function depart(mergeState: MergeState, record: RuleRecord): void;
//# sourceMappingURL=treeEdits.d.ts.map