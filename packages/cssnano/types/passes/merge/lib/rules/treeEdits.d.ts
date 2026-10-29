import type { AtRule, ChildNode, Container, Declaration, Rule } from 'postcss';
import type { PropertyWrites } from './lastWriteIndex.js';
import type MergeState from './mergeState.js';
/** @import {AtRule, ChildNode, Container, Declaration, Rule} from 'postcss' */
/** @import {PropertyWrites} from './lastWriteIndex.js' */
/** @import MergeState from './mergeState.js' */
/**
 * The only edits that rule merging makes to the live tree. Each one clears the
 * summaries and descriptions of the nodes it changes, so a join cannot leave a
 * stale cache behind. Lib code outside this module edits through these names.
 */
/**
 * Appends the children of `from` to `into`, after its own. `from` is left
 * empty, so the caller removes or replaces it.
 *
 * @param {Container} into
 * @param {Container} from
 * @return {void}
 */
export declare function moveChildren(into: Container, from: Container): void;
/**
 * Takes `node` out of its parent at once. The parent's child list catches up at
 * the next `takePlaceOf` or `flushRemovals`.
 *
 * @param {ChildNode} node
 * @return {void}
 */
export declare function remove(node: ChildNode): void;
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
 * @param {Container} parent
 * @param {Rule | AtRule} earlier
 * @param {Rule | AtRule} later
 * @return {void}
 */
export declare function takePlaceOf(parent: Container, earlier: Rule | AtRule, later: Rule | AtRule): void;
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
export type Rebuilt = {
    container: Container;
    /**
     * the children the container takes
     */
    children: ChildNode[];
    /**
     * the first child the container held before
     */
    head: ChildNode;
};
/**
 * @typedef {object} Rebuilt
 * @property {Container} container
 * @property {ChildNode[]} children the children the container takes
 * @property {ChildNode} head the first child the container held before
 */
/**
 * Gives each container its children, after every container has been emptied,
 * so a child that moves between two of them keeps the parent it is given.
 *
 * @param {Rebuilt[]} rebuilt
 * @return {void}
 */
export declare function replaceChildren(rebuilt: Rebuilt[]): void;
/**
 * Forgets a rule that a placement drops. The rule leaves the tree when
 * `replaceChildren` applies the placement.
 *
 * @param {MergeState} mergeState
 * @param {Rule} rule
 * @return {void}
 */
export declare function retire(mergeState: MergeState, rule: Rule): void;
//# sourceMappingURL=treeEdits.d.ts.map