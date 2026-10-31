import type { RuleRecord } from './ruleRecord.js';
import type { BlockRecord } from './blockRecords.js';
import type RuleSequence, { Placement, RuleLink } from './ruleSequence.js';
import type MergeState from './mergeState.js';
/**
 * Rules with the same declarations in the same order become one rule with
 * both selectors.
 *
 * @param {RuleRecord} first
 * @param {RuleRecord} second
 * @param {MergeState} mergeState
 * @return {Placement | null}
 */
export declare function mergeMatchingDeclarations(first: RuleRecord, second: RuleRecord, mergeState: MergeState): Placement | null;
/**
 * Rules with the same selector become one rule with both declaration lists.
 *
 * @param {RuleRecord} first
 * @param {RuleRecord} second
 * @param {MergeState} mergeState
 * @return {Placement | null}
 */
export declare function mergeMatchingSelectors(first: RuleRecord, second: RuleRecord, mergeState: MergeState): Placement | null;
/**
 * Rules that share declarations hand them to a rule of their own.
 *
 * @param {RuleRecord} first
 * @param {RuleRecord} second
 * @param {MergeState} mergeState
 * @param {RuleLink} secondLink
 * @param {RuleSequence} sequence
 * @param {WeakMap<BlockRecord, boolean>} outsideDeclarations
 * @return {Placement | null} null when sharing the declarations would not
 * make the output shorter
 */
export declare function mergeSharedDeclarations(first: RuleRecord, second: RuleRecord, mergeState: MergeState, secondLink: RuleLink, sequence: RuleSequence, outsideDeclarations: WeakMap<BlockRecord, boolean>): Placement | null;
//# sourceMappingURL=merge.d.ts.map