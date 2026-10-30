import {
  mergeMatchingDeclarations,
  mergeMatchingSelectors,
  mergeSharedDeclarations,
} from './merge.js';
import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { assertSweepLowers, sweepPotential } from './sweepPotential.js';
import { earliestPairReaching } from './sharedRuleGroup.js';
import RuleSequence from './ruleSequence.js';
import { sameContainer } from './sameContainer.js';

const NO_BENEFIT = -1;

/**
 * @param {Placement} placement
 * @return {number} the rules the placement puts in place of the pair
 */
function linkCount(placement) {
  let count = placement.first.length + placement.second.length;
  for (const rules of placement.following ?? []) count += rules.length;
  return count;
}

/** @import {Rule} from 'postcss' */
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
export default function runScan(mergeState) {
  /**
   * Orders pairs for merging. For equal selectors it is the number of
   * declarations in both rules, since the selector is written once. Otherwise
   * it is the number of declarations the rules share, or 0 when only a move
   * into an equivalent parent or the removal of empty rules applies.
   *
   * @param {RuleLink} first
   * @param {RuleLink} second
   * @return {number} NO_BENEFIT when merging the pair cannot rewrite anything
   */
  const mergeBenefit = (first, second) => {
    const a = mergeState.declarationKeysOf(first.record.node);
    const b = mergeState.declarationKeysOf(second.record.node);
    if (
      mergeState
        .meta(first.record.node)
        .hasSameSelectors(mergeState.meta(second.record.node))
    )
      return a.keys.length + b.keys.length;
    const [smaller, larger] =
      a.keys.length <= b.keys.length ? [a, b.keySet] : [b, a.keySet];
    let shared = 0;
    for (const key of smaller.keySet) {
      if (larger.has(key)) shared++;
    }
    if (shared > 0) return shared;
    const rewritesStructure =
      (a.keys.length === 0 && b.keys.length === 0) ||
      (first.slot.block !== second.slot.block &&
        sameContainer(
          first.slot.block,
          second.slot.block,
          mergeState.textTable
        ));
    return rewritesStructure ? 0 : NO_BENEFIT;
  };

  // Pairs that passed `canMerge` as the best candidate but rewrote nothing;
  // they are skipped until another rewrite can change the outcome.
  /** @type {Map<Rule, Rule>} */
  const unmergeablePairs = new Map();

  /** @param {RuleLink} first @param {RuleLink} second */
  const pairBenefit = (first, second) =>
    unmergeablePairs.get(first.record.node) === second.record.node
      ? NO_BENEFIT
      : mergeBenefit(first, second);

  /** @type {WeakMap<BlockRecord, boolean>} */
  const outsideDeclarations = new WeakMap();

  /**
   * @param {RuleSequence} sequence
   * @param {RuleLink} first
   * @param {RuleLink} second
   * @return {{placement: Placement, moved: boolean} | null} the rules that
   * now stand in place of the pair, or null when nothing changed
   */
  const mergePair = (sequence, first, second) => {
    if (
      !mergeState.canMerge(
        first.record.node,
        second.record.node,
        first.slot.block,
        second.slot.block
      ) ||
      sequence.declarationBetween(first, second, outsideDeclarations)
    ) {
      return null;
    }
    const moved = sequence.moveIntoParent(first, second);
    const placement =
      mergeMatchingDeclarations(
        first.record.node,
        second.record.node,
        mergeState
      ) ??
      mergeMatchingSelectors(
        first.record.node,
        second.record.node,
        mergeState
      ) ??
      mergeSharedDeclarations(
        first.record.node,
        second.record.node,
        mergeState,
        second,
        sequence,
        outsideDeclarations
      );
    if (placement) return { placement, moved };
    return moved
      ? { placement: { first: [first.record], second: [second.record] }, moved }
      : null;
  };

  /** @type {number[]} */
  const scratch = [];
  /** @type {{link: RuleLink | null, distance: number}} */
  const earliest = { link: null, distance: 0 };

  /**
   * The link where the sweep resumes after a rewrite. The normal resume point
   * is the lookahead, the rule before the new rules, or the first new rule.
   * The rewrite can also change a pair before it, up to the reach of a group
   * (see `earliestPairReaching`), so the sweep resumes at the earliest such pair.
   *
   * @param {RuleLink} replacement the first link of the new rules
   * @param {Placement} placement
   * @param {RuleLink | null} lookaheadStart a link before the replaced pair,
   * since the lookahead moves past it
   * @return {RuleLink}
   */
  const resumeAfter = (replacement, placement, lookaheadStart) => {
    const before = /** @type {RuleLink} */ (replacement.prev);
    let resume = replacement;
    if (lookaheadStart) {
      resume = lookaheadStart;
    } else if (before.record) {
      resume = before;
    }
    earliest.link = null;
    let link = replacement;
    const count = linkCount(placement);
    for (let index = 0; index < count; index++) {
      // The walk from the `index`th new rule starts `index` links after the
      // first one, so its distance is measured from the first.
      earliestPairReaching(link, resume, index, scratch, mergeState, earliest);
      link = /** @type {RuleLink} */ (link.next);
    }
    return earliest.link ?? resume;
  };

  let moved;
  do {
    moved = false;
    const before = consistencyChecksEnabled()
      ? sweepPotential(mergeState.records)
      : null;
    const sequence = new RuleSequence(mergeState.records);
    const list = sequence.head;
    let current = list.next ?? list;
    /** @type {RuleLink | null} */
    let lookaheadStart = null;
    for (let second = current.next; second; second = current.next) {
      let benefit = pairBenefit(current, second);
      // Move on to the next pair while it shares strictly more declarations,
      // then come back to `lookaheadStart` so the skipped pairs are tried.
      for (let third = second.next; third; third = second.next) {
        const ahead = pairBenefit(second, third);
        if (ahead <= benefit) break;
        lookaheadStart ??= current;
        current = second;
        second = third;
        benefit = ahead;
      }
      const merged =
        benefit === NO_BENEFIT ? null : mergePair(sequence, current, second);
      if (!merged) {
        if (lookaheadStart && benefit !== NO_BENEFIT) {
          unmergeablePairs.set(current.record.node, second.record.node);
          current = lookaheadStart;
        } else {
          current = second;
        }
        lookaheadStart = null;
        continue;
      }
      moved ||= merged.moved;
      unmergeablePairs.clear();
      const replacement = sequence.replacePair(current, merged.placement);
      current = resumeAfter(replacement, merged.placement, lookaheadStart);
      lookaheadStart = null;
    }
    sequence.finish();
    if (before) {
      assertSweepLowers(before, sweepPotential(mergeState.records), moved);
    }
    // A move changes which rules share a parent, so rules the sweep already
    // passed may now merge.
  } while (moved);
}
