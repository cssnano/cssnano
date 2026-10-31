import type MergeState from './mergeState.js';
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecord} from './blockRecords.js' */
/** @import MergeState from './mergeState.js' */
/** @import {Placement, RuleLink} from './ruleSequence.js' */
/**
 * Merges neighboring rules in left-to-right sweeps, trying the pair that
 * shares the most declarations first and the earlier pair on a tie. That
 * approximates merging the best pair of the whole stylesheet first. The two
 * orders give the same output on the framework corpus but not on every input.
 *
 * Termination: a rewrite either writes fewer declarations, writes as many in
 * fewer rules, or moves a rule into the parent of an earlier rule with an
 * equivalent parent, and replacements stay where they are. Neither the
 * counts nor the positions can recur, so the sweeps stop once one moves no
 * rule. The length is no measure: sharing declarations is judged by the
 * minified length, which source whitespace can contradict.
 *
 * No bound on the sweeps in terms of the number of rules is proved, per call
 * or in total. The most measured in one call is 2 (see
 * `perf/passes/merge/lib/rules/loopCounts.js`): no input was found in which a
 * move in one sweep unblocks a move in the next.
 *
 * @param {MergeState} mergeState its records are the stylesheet the sweep rewrites
 * @return {void}
 */
export default function runScan(mergeState: MergeState): void;
//# sourceMappingURL=scan.d.ts.map