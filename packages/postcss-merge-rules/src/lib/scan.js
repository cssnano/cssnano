import cssnanoUtils from 'cssnano-utils';
import {
  mergeMatchingDeclarations,
  mergeMatchingSelectors,
  mergeSharedDeclarations,
} from './merge.js';
import RuleSequence from './ruleSequence.js';

const { sameContainer } = cssnanoUtils;

const NO_BENEFIT = -1;

/** @import {Container, Root, Rule} from 'postcss' */
/** @import MergeState from './mergeState.js' */
/** @import {Placement, RuleLink} from './ruleSequence.js' */

/**
 * Merges neighboring rules in left-to-right sweeps, trying the pair that
 * shares the most declarations first and the earlier pair on a tie. That
 * approximates merging the best pair of the whole stylesheet first. The two
 * orders give the same output on the framework corpus but not on every input.
 *
 * Termination: a rewrite either shortens the output or moves a rule into the
 * parent of an earlier rule with an equivalent parent, and replacements stay
 * where they are. Neither the length nor the positions can recur, so the
 * sweeps stop once one moves no rule.
 *
 * @param {Root} root
 * @param {MergeState} mergeState
 * @return {void}
 */
export default function runScan(root, mergeState) {
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
    const a = mergeState.declarationKeysOf(first.rule);
    const b = mergeState.declarationKeysOf(second.rule);
    if (
      mergeState.meta(first.rule).hasSameSelectors(mergeState.meta(second.rule))
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
      (first.slot.parent !== second.slot.parent &&
        sameContainer(first.slot.parent, second.slot.parent));
    return rewritesStructure ? 0 : NO_BENEFIT;
  };

  // Pairs that passed `canMerge` as the best candidate but rewrote nothing;
  // they are skipped until another rewrite can change the outcome.
  /** @type {Map<Rule, Rule>} */
  const unmergeablePairs = new Map();

  /** @param {RuleLink} first @param {RuleLink} second */
  const pairBenefit = (first, second) =>
    unmergeablePairs.get(first.rule) === second.rule
      ? NO_BENEFIT
      : mergeBenefit(first, second);

  /** @type {WeakMap<Container, boolean>} */
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
        first.rule,
        second.rule,
        first.slot.parent,
        second.slot.parent
      ) ||
      sequence.declarationBetween(first, second, outsideDeclarations)
    ) {
      return null;
    }
    const moved = sequence.moveIntoParent(first, second);
    const placement =
      mergeMatchingDeclarations(first.rule, second.rule, mergeState) ??
      mergeMatchingSelectors(first.rule, second.rule, mergeState) ??
      mergeSharedDeclarations(first.rule, second.rule, mergeState);
    if (placement) return { placement, moved };
    return moved
      ? { placement: { first: [first.rule], second: [second.rule] }, moved }
      : null;
  };

  let moved;
  do {
    moved = false;
    const sequence = new RuleSequence(root);
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
          unmergeablePairs.set(current.rule, second.rule);
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
      const before = /** @type {RuleLink} */ (replacement.prev);
      if (lookaheadStart) {
        current = lookaheadStart === current ? replacement : lookaheadStart;
      } else {
        current = before.rule ? before : replacement;
      }
      lookaheadStart = null;
    }
    sequence.write();
    // A move changes which rules share a parent, so rules the sweep already
    // passed may now merge.
  } while (moved);
}
