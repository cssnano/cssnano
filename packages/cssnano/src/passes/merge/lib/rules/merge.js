import {
  filterRuleIntersections,
  intersect,
  sameDeclarationsAndOrder,
} from './declarations.js';
import { getDecls } from './ruleRecord.js';
import { buildMergedRule, writesOf } from './ruleRewrite.js';
import { appendToDeclarations, depart } from './treeEdits.js';

/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecord} from './blockRecords.js' */
/** @import RuleSequence, {Placement, RuleLink} from './ruleSequence.js' */
/** @import MergeState from './mergeState.js' */

/**
 * @param {RuleRecord} first
 * @param {RuleRecord} second
 * @param {MergeState} mergeState
 * @param {RuleLink} secondLink
 * @param {RuleSequence} sequence
 * @param {WeakMap<BlockRecord, boolean>} outsideDeclarations
 * @return {Placement | null} the rules that replace the pair, or null when
 * sharing the declarations would not make the output shorter
 */
function partialMerge(
  first,
  second,
  mergeState,
  secondLink,
  sequence,
  outsideDeclarations
) {
  let intersection = intersect(
    first.declarations,
    mergeState.declarationKeysOf(second).keySet,
    mergeState.declarationKey
  );
  if (intersection.length === 0) return null;
  const filtered = filterRuleIntersections(
    intersection,
    [...first.declarations],
    [...second.declarations],
    mergeState.properties
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
    !first.node.nodes.every((node) => node.type === 'decl') ||
    !second.node.nodes.every((node) => node.type === 'decl') ||
    !sameDeclarationsAndOrder(second.declarations, first.declarations)
  )
    return null;
  // Repeating the same declarations under the same selector changes nothing,
  // and a selector list that repeats the selector is longer than one rule.
  if (first.hasSameSelectors(second)) {
    depart(mergeState, second);
    return { first: [first], second: [] };
  }
  mergeState.absorbEarlier(second, first);
  mergeState.spellSelectors(second);
  depart(mergeState, first);
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
  const kept = getDecls(first.node);
  appendToDeclarations(
    mergeState,
    first,
    kept,
    writesOf(kept, mergeState.properties),
    second
  );
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
 * @return {Placement | null} null when sharing the declarations would not
 * make the output shorter
 */
export function mergeSharedDeclarations(
  first,
  second,
  mergeState,
  secondLink,
  sequence,
  outsideDeclarations
) {
  const placement = partialMerge(
    first,
    second,
    mergeState,
    secondLink,
    sequence,
    outsideDeclarations
  );
  if (!placement) return null;
  // The rules that replace the pair are described afresh when needed.
  depart(mergeState, first);
  depart(mergeState, second);
  return placement;
}
