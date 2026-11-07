import {
  mergeMatchingDeclarations,
  mergeMatchingSelectors,
  mergeSharedDeclarations,
} from './merge.js';
import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { assertSweepLowers, sweepPotential } from './sweepPotential.js';
import { earliestPairReaching } from './sharedRuleGroup.js';
import RuleSequence from './ruleSequence.js';
import DeclarationScan from './declarationScan.js';
import { sameContainer } from './sameContainer.js';
import { declarationKeys } from './declarationCache.js';

/** @import {ArenaIndex} from './blockRecord.js' */

const NO_BENEFIT = -1;

/**
 * Measures the reach of each rule of `rules`, the new rules of one slot.
 * `offset` counts the rules the sweep visited before them, from the first one.
 *
 * @param {RuleSequence} sequence
 * @param {ArenaIndex[]} rules
 * @param {ArenaIndex | -1} resume
 * @param {number} offset
 * @param {number[]} scratch
 * @param {MergeState} mergeState
 * @param {{link: ArenaIndex | -1, distance: number}} earliest
 * @return {number} the offset after the last rule of `rules`
 */
function reachRules(
  sequence,
  rules,
  resume,
  offset,
  scratch,
  mergeState,
  earliest
) {
  for (let index = 0; index < rules.length; index++) {
    earliestPairReaching(
      sequence,
      rules[index],
      resume,
      offset + index,
      scratch,
      mergeState,
      earliest
    );
  }
  return offset + rules.length;
}

/**
 * Asserts under checks that `rules` follow `previous` in the sequence, the
 * first of them following nothing but `replacement`.
 *
 * @param {RuleSequence} sequence
 * @param {ArenaIndex[]} rules
 * @param {ArenaIndex | -1} replacement
 * @param {ArenaIndex | -1} previous the last rule checked, -1 before the first
 * @return {ArenaIndex | -1} the last rule checked
 */
function checkPlacedRules(sequence, rules, replacement, previous) {
  let last = previous;
  for (const rule of rules) {
    const expected = last === -1 ? replacement : sequence.nextOf(last);
    if (rule !== expected) {
      throw new Error('a placed rule is not linked after the rule before it');
    }
    last = rule;
  }
  return last;
}

/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import MergeState from './mergeState.js' */
/** @import {Placement} from './ruleSequence.js' */

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
  /** @param {number} index @return {RuleRecord} */
  const rule = (index) =>
    /** @type {RuleRecord} */ (mergeState.records.rule(index));

  /**
   * Orders pairs for merging. For equal selectors it is the number of
   * declarations in both rules, since the selector is written once. Otherwise
   * it is the number of declarations the rules share, or 0 when only a move
   * into an equivalent parent or the removal of empty rules applies.
   *
   * @param {RuleRecord} first
   * @param {RuleRecord} second
   * @return {number} NO_BENEFIT when merging the pair cannot rewrite anything
   */
  const mergeBenefit = (first, second) => {
    const a = declarationKeys(mergeState.records, first.index);
    const b = declarationKeys(mergeState.records, second.index);
    if (first.hasSameSelectors(second)) return a.keys.length + b.keys.length;
    const [smaller, larger] =
      a.keys.length <= b.keys.length ? [a, b.keySet] : [b, a.keySet];
    let shared = 0;
    for (const key of smaller.keySet) {
      if (larger.has(key)) shared++;
    }
    if (shared > 0) return shared;
    const rewritesStructure =
      (a.keys.length === 0 && b.keys.length === 0) ||
      (mergeState.records.links.parentOf(first.index) !==
        mergeState.records.links.parentOf(second.index) &&
        sameContainer(mergeState.blockOf(first), mergeState.blockOf(second)));
    return rewritesStructure ? 0 : NO_BENEFIT;
  };

  // Pairs that passed `canMerge` as the best candidate but rewrote nothing;
  // they are skipped until another rewrite can change the outcome.
  /** @type {Map<number, number>} */
  const unmergeablePairs = new Map();

  /** @param {ArenaIndex} first @param {ArenaIndex} second */
  const pairBenefit = (first, second) =>
    unmergeablePairs.get(first) === second
      ? NO_BENEFIT
      : mergeBenefit(rule(first), rule(second));

  const scan = new DeclarationScan();

  /**
   * @param {RuleSequence} sequence
   * @param {ArenaIndex} first
   * @param {ArenaIndex} second
   * @return {{placement: Placement, moved: boolean} | null} the rules that
   * now stand in place of the pair, or null when nothing changed
   */
  const mergePair = (sequence, first, second) => {
    const a = rule(first);
    const b = rule(second);
    if (
      !mergeState.canMerge(
        a,
        b,
        mergeState.records.links.parentOf(a.index),
        mergeState.records.links.parentOf(b.index)
      ) ||
      scan.declarationBetween(mergeState.records, a, b)
    ) {
      return null;
    }
    const moved = sequence.moveIntoParent(mergeState.records, first, second);
    const placement =
      mergeMatchingDeclarations(a, b, mergeState) ??
      mergeMatchingSelectors(a, b, mergeState) ??
      mergeSharedDeclarations(a, b, mergeState, second, sequence, scan);
    if (placement) return { placement, moved };
    return moved
      ? { placement: { first: [a.index], second: [b.index] }, moved }
      : null;
  };

  /** @type {number[]} */
  const scratch = [];
  /** @type {{link: ArenaIndex | -1, distance: number}} */
  const earliest = { link: -1, distance: 0 };

  /**
   * The rule where the sweep resumes after a rewrite. The normal resume point
   * is the lookahead, the rule before the new rules, or the first new rule.
   * The rewrite can also change a pair before it, up to the reach of a group
   * (see `earliestPairReaching`), so the sweep resumes at the earliest such pair.
   *
   * @param {RuleSequence} sequence
   * @param {ArenaIndex | -1} replacement the first of the new rules
   * @param {Placement} placement
   * @param {ArenaIndex | -1} lookaheadStart a rule before the replaced pair, -1 for none,
   * since the lookahead moves past it
   * @return {ArenaIndex | -1}
   */
  const resumeAfter = (sequence, replacement, placement, lookaheadStart) => {
    const before = sequence.prevOf(replacement);
    let resume = replacement;
    if (lookaheadStart !== -1) {
      resume = lookaheadStart;
    } else if (before !== -1) {
      resume = before;
    }
    earliest.link = -1;
    const { first, second, following = [] } = placement;
    let offset = reachRules(
      sequence,
      first,
      resume,
      0,
      scratch,
      mergeState,
      earliest
    );
    offset = reachRules(
      sequence,
      second,
      resume,
      offset,
      scratch,
      mergeState,
      earliest
    );
    for (const rules of following) {
      offset = reachRules(
        sequence,
        rules,
        resume,
        offset,
        scratch,
        mergeState,
        earliest
      );
    }
    if (consistencyChecksEnabled()) {
      let last = checkPlacedRules(sequence, first, replacement, -1);
      last = checkPlacedRules(sequence, second, replacement, last);
      for (const rules of following) {
        last = checkPlacedRules(sequence, rules, replacement, last);
      }
    }
    return earliest.link === -1 ? resume : earliest.link;
  };

  let moved;
  do {
    moved = false;
    const before = consistencyChecksEnabled()
      ? sweepPotential(mergeState.records, null)
      : null;
    const sequence = new RuleSequence(mergeState.records);
    let current = sequence.head;
    /** @type {ArenaIndex | -1} */
    let lookaheadStart = -1;
    for (
      let second = sequence.nextOf(current);
      current !== -1 && second !== -1;
      second = sequence.nextOf(current)
    ) {
      let benefit = pairBenefit(current, second);
      // Move on to the next pair while it shares strictly more declarations,
      // then come back to `lookaheadStart` so the skipped pairs are tried.
      for (
        let third = sequence.nextOf(second);
        third !== -1;
        third = sequence.nextOf(second)
      ) {
        const ahead = pairBenefit(second, third);
        if (ahead <= benefit) break;
        if (lookaheadStart === -1) lookaheadStart = current;
        current = second;
        second = third;
        benefit = ahead;
      }
      const merged =
        benefit === NO_BENEFIT ? null : mergePair(sequence, current, second);
      if (!merged) {
        if (lookaheadStart !== -1 && benefit !== NO_BENEFIT) {
          unmergeablePairs.set(current, second);
          current = lookaheadStart;
        } else {
          current = second;
        }
        lookaheadStart = -1;
        continue;
      }
      moved ||= merged.moved;
      unmergeablePairs.clear();
      const replacement = sequence.replacePair(
        mergeState.records,
        current,
        merged.placement
      );
      current = resumeAfter(
        sequence,
        replacement,
        merged.placement,
        lookaheadStart
      );
      lookaheadStart = -1;
    }
    if (before) {
      assertSweepLowers(
        before.potential,
        sweepPotential(mergeState.records, before.numbers).potential,
        moved
      );
    }
    // A move changes which rules share a parent, so rules the sweep already
    // passed may now merge.
  } while (moved);
}
