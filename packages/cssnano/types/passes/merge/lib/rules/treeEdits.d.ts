import { BlockRecords } from './blockRecords.js';
import type { AtRule, Container, Declaration, Root, Rule } from 'postcss';
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
 * Appends the children of `from` to `into`, after its own. `from` is left
 * empty, so the caller removes or replaces it.
 *
 * @param {MergeState} mergeState
 * @param {Container} into
 * @param {Container} from
 * @return {void}
 */
export declare function moveChildren(mergeState: MergeState, into: Container, from: Container): void;
/**
 * Takes `node` out of its parent at once. The parent's child list catches up at
 * the next `takePlaceOf` or `flushRemovals`.
 *
 * @param {MergeState} mergeState
 * @param {Rule | AtRule} node
 * @return {void}
 */
export declare function remove(mergeState: MergeState, node: Rule | AtRule): void;
/**
 * Applies the pending removals of `parent`, so its child list is current.
 *
 * @param {Container} parent
 * @return {void}
 */
export declare function flushRemovals(parent: Container): void;
/**
 * Moves `earlier`, which already holds the joined content, to the place of
 * `later`, so the joined node takes the later position and keeps the
 * whitespace before `later`.
 *
 * @param {MergeState} mergeState
 * @param {Container} parent
 * @param {Rule | AtRule} earlier
 * @param {Rule | AtRule} later
 * @return {void}
 */
export declare function takePlaceOf(mergeState: MergeState, parent: Container, earlier: Rule | AtRule, later: Rule | AtRule): void;
/**
 * Appends the content of `incoming` to `receiving`. A declaration of
 * `incoming` is redundant only when the last declaration of `receiving` that
 * can set the same property already has an identical value. Otherwise it
 * revives an overridden value or overrides intermediate declarations, so
 * appending it is required to preserve the cascade result.
 *
 * @param {MergeState} mergeState
 * @param {Rule} receiving
 * @param {Declaration[]} kept the declarations of `receiving`, extended in place
 * @param {PropertyWrites} index the writes of `kept`, extended in place
 * @param {Rule} incoming
 * @return {void}
 */
export declare function appendToDeclarations(mergeState: MergeState, receiving: Rule, kept: Declaration[], index: PropertyWrites, incoming: Rule): void;
/**
 * Removes `declarations` from `rule`, which keeps the others.
 *
 * @param {MergeState} mergeState
 * @param {Rule} rule
 * @param {Declaration[]} declarations
 * @return {void}
 */
export declare function removeDeclarations(mergeState: MergeState, rule: Rule, declarations: Declaration[]): void;
/**
 * Removes `rules` from `parent` with one pass over its children.
 *
 * @param {MergeState} mergeState
 * @param {Container} parent
 * @param {Set<Rule>} rules
 * @return {void}
 */
export declare function removeRules(mergeState: MergeState, parent: Container, rules: Set<Rule>): void;
/**
 * Marks a rule that a placement drops as departed. The rule leaves the tree
 * when `replaceChildren` applies the placement, and reading its record throws
 * from now on.
 *
 * @param {MergeState} mergeState
 * @param {Rule} rule
 * @return {void}
 */
export declare function depart(mergeState: MergeState, rule: Rule): void;
//# sourceMappingURL=treeEdits.d.ts.map