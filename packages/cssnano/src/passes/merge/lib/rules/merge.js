import {
  declarationsOf,
  holdsOnlyDeclarationsOf,
} from '../../../ir/blockChildren.js';
import {
  filterRuleIntersections,
  intersect,
  sameDeclarationsAndOrder,
} from '../../../ir/declarations.js';
import { buildMergedRule } from './ruleRewrite.js';
import { appendToDeclarations } from '../../../ir/treeEdits.js';
import { declarationKeys } from '../../../ir/declarationCache.js';
import { hasSameSelectors } from '../../../ir/selectorReads.js';

/** @import {RuleRecord} from '../../../ir/ruleRecord.js' */
/** @import {ArenaIndex, BlockRecord} from '../../../ir/blockRecord.js' */
/** @import RuleSequence, {Placement} from './ruleSequence.js' */
/** @import DeclarationScan from './declarationScan.js' */
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
    first.context !== -1 ||
    second.context !== -1 ||
    !holdsOnlyDeclarationsOf(mergeState.records, first.index) ||
    !holdsOnlyDeclarationsOf(mergeState.records, second.index) ||
    !sameDeclarationsAndOrder(
      mergeState.records,
      declarationKeys(mergeState.records, second.index).kept,
      declarationKeys(mergeState.records, first.index).kept
    )
  )
    return null;
  // Repeating the same declarations under the same selector changes nothing,
  // and a selector list that repeats the selector is longer than one rule.
  if (hasSameSelectors(mergeState.records, first.index, second.index)) {
    return { first: [first.index], second: [] };
  }
  mergeState.absorbEarlier(second, first);
  return { first: [], second: [second.index] };
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
  if (!hasSameSelectors(mergeState.records, first.index, second.index)) {
    return null;
  }
  appendToDeclarations(mergeState, first.index, second.index);
  return { first: [first.index], second: [] };
}

/**
 * Rules that share declarations hand them to a rule of their own.
 *
 * @param {RuleRecord} first
 * @param {RuleRecord} second
 * @param {MergeState} mergeState
 * @param {ArenaIndex} secondLink the index of `second` in the sweep
 * @param {RuleSequence} sequence
 * @param {DeclarationScan} scan
 * @return {Placement | null} the rules that replace the pair, or null when
 * sharing the declarations would not make the output shorter
 */
export function mergeSharedDeclarations(
  first,
  second,
  mergeState,
  secondLink,
  sequence,
  scan
) {
  const { records } = mergeState;
  const firstDeclarations = declarationsOf(records, first.index);
  let intersection = intersect(
    firstDeclarations,
    declarationKeys(records, second.index).keySet
  );
  if (intersection.length === 0) return null;
  const filtered = filterRuleIntersections(
    intersection,
    firstDeclarations,
    declarationsOf(records, second.index)
  );
  intersection = filtered.intersection;
  if (intersection.length === 0) return null;
  return buildMergedRule(
    first.index,
    second.index,
    intersection,
    filtered.claimedIndices,
    mergeState,
    secondLink,
    sequence,
    scan
  );
}
