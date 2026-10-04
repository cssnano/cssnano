import type { Rule } from 'postcss';
import type { Placement } from './ruleSequence.js';
import type MergeState from './mergeState.js';
/**
 * Rules with the same declarations in the same order become one rule with
 * both selectors.
 *
 * @param {Rule} first
 * @param {Rule} second
 * @param {MergeState} mergeState
 * @return {Placement | null}
 */
export declare function mergeMatchingDeclarations(first: Rule, second: Rule, mergeState: MergeState): Placement | null;
/**
 * Rules with the same selector become one rule with both declaration lists.
 *
 * @param {Rule} first
 * @param {Rule} second
 * @param {MergeState} mergeState
 * @return {Placement | null}
 */
export declare function mergeMatchingSelectors(first: Rule, second: Rule, mergeState: MergeState): Placement | null;
/**
 * Rules that share declarations hand them to a rule of their own.
 *
 * @param {Rule} first
 * @param {Rule} second
 * @param {MergeState} mergeState
 * @return {Placement | null} null when sharing the declarations would not
 * make the output shorter
 */
export declare function mergeSharedDeclarations(first: Rule, second: Rule, mergeState: MergeState): Placement | null;
//# sourceMappingURL=merge.d.ts.map