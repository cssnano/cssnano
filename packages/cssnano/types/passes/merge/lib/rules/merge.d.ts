import type { RuleRecord } from './ruleRecord.js';
import type { ArenaIndex } from './blockRecord.js';
import type RuleSequence, { Placement } from './ruleSequence.js';
import type MergeState from './mergeState.js';
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {ArenaIndex, BlockRecord} from './blockRecord.js' */
/** @import RuleSequence, {Placement} from './ruleSequence.js' */
/** @import MergeState from './mergeState.js' */
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
 * @param {ArenaIndex} secondLink the index of `second` in the sweep
 * @param {RuleSequence} sequence
 * @param {Map<number, boolean>} outsideDeclarations
 * @return {Placement | null} the rules that replace the pair, or null when
 * sharing the declarations would not make the output shorter
 */
export declare function mergeSharedDeclarations(first: RuleRecord, second: RuleRecord, mergeState: MergeState, secondLink: ArenaIndex, sequence: RuleSequence, outsideDeclarations: Map<number, boolean>): Placement | null;
//# sourceMappingURL=merge.d.ts.map