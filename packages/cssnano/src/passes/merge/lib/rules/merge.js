import {
  filterRuleIntersections,
  intersect,
  sameDeclarationsAndOrder,
} from './declarations.js';
import { buildMergedRule, writesOf } from './ruleRewrite.js';
import { appendToDeclarations } from './treeEdits.js';

/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/** @import RuleSequence, {Placement, RuleLink} from './ruleSequence.js' */
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
export function mergeMatchingDeclarations(first, second, mergeState) {
  if (
    first.block !== -1 ||
    second.block !== -1 ||
    !first.holdsOnlyDeclarations() ||
    !second.holdsOnlyDeclarations() ||
    !sameDeclarationsAndOrder(second.declarations, first.declarations)
  )
    return null;
  // Repeating the same declarations under the same selector changes nothing,
  // and a selector list that repeats the selector is longer than one rule.
  if (first.hasSameSelectors(second)) {
    second.depart();
    return { first: [first], second: [] };
  }
  mergeState.absorbEarlier(second, first);
  mergeState.spellSelectors(second);
  first.depart();
  return { first: [], second: [second] };
}

/**
 * Rules with the same selector become one rule with both declaration lists.
 *
 * @param {RuleRecord} first
 * @param {RuleRecord} second
 * @param {MergeState} mergeState
 * @return {Placement | null}
 */
export function mergeMatchingSelectors(first, second, mergeState) {
  if (!first.hasSameSelectors(second)) return null;
  appendToDeclarations(mergeState, first, writesOf(first.declarations), second);
  return { first: [first], second: [] };
}

/**
 * Rules that share declarations hand them to a rule of their own.
 *
 * @param {RuleRecord} first
 * @param {RuleRecord} second
 * @param {MergeState} mergeState
 * @param {RuleLink} secondLink
 * @param {RuleSequence} sequence
 * @param {WeakMap<BlockRecord, boolean>} outsideDeclarations
 * @return {Placement | null} the rules that replace the pair, or null when
 * sharing the declarations would not make the output shorter
 */
export function mergeSharedDeclarations(
  first,
  second,
  mergeState,
  secondLink,
  sequence,
  outsideDeclarations
) {
  let intersection = intersect(
    first.declarations,
    second.declarationKeys(mergeState.records).keySet
  );
  if (intersection.length === 0) return null;
  const filtered = filterRuleIntersections(
    intersection,
    first.declarations,
    second.declarations
  );
  intersection = filtered.intersection;
  if (intersection.length === 0) return null;
  return buildMergedRule(
    first,
    second,
    filtered.claimedEarlierIndices,
    filtered.claimedIndices,
    mergeState,
    secondLink,
    sequence,
    outsideDeclarations
  );
}
