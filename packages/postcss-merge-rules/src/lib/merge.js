import {
  filterRuleIntersections,
  intersect,
  sameDeclarationsAndOrder,
} from './declarations.js';
import { getDecls } from './ruleMeta.js';
import { appendDeclarations, buildMergedRule } from './ruleRewrite.js';

/** @import {Rule} from 'postcss' */
/** @import {Placement} from './ruleSequence.js' */
/** @import MergeState from './mergeState.js' */

/**
 * @param {Rule} first
 * @param {Rule} second
 * @param {MergeState} mergeState
 * @return {Placement | null} the rules that replace the pair, or null when
 * sharing the declarations would not make the output shorter
 */
function partialMerge(first, second, mergeState) {
  const metaFirst = mergeState.meta(first);
  const metaSecond = mergeState.meta(second);
  let intersection = intersect(metaFirst.declarations, metaSecond.declarations);
  if (intersection.length === 0) return null;
  const filtered = filterRuleIntersections(
    intersection,
    [...metaFirst.declarations],
    [...metaSecond.declarations]
  );
  intersection = filtered.intersection;
  if (intersection.length === 0) return null;
  return buildMergedRule(
    first,
    second,
    filtered.claimedEarlierIndices,
    filtered.claimedIndices,
    mergeState
  );
}

/**
 * Rules with the same declarations in the same order become one rule with
 * both selectors.
 *
 * @param {Rule} first
 * @param {Rule} second
 * @param {MergeState} mergeState
 * @return {Placement | null}
 */
export function mergeMatchingDeclarations(first, second, mergeState) {
  if (
    !first.nodes.every((node) => node.type === 'decl') ||
    !second.nodes.every((node) => node.type === 'decl') ||
    !sameDeclarationsAndOrder(
      mergeState.meta(second).declarations,
      mergeState.meta(first).declarations
    )
  )
    return null;
  // Repeating the same declarations under the same selector changes nothing,
  // and a selector list that repeats the selector is longer than one rule.
  if (mergeState.meta(first).hasSameSelectors(mergeState.meta(second))) {
    mergeState.forget(second);
    return { first: [first], second: [] };
  }
  mergeState.absorbEarlier(second, first);
  second.selector = mergeState.meta(second).selectorText();
  mergeState.forget(first);
  mergeState.markCompatible(second);
  return { first: [], second: [second] };
}

/**
 * Rules with the same selector become one rule with both declaration lists.
 *
 * @param {Rule} first
 * @param {Rule} second
 * @param {MergeState} mergeState
 * @return {Placement | null}
 */
export function mergeMatchingSelectors(first, second, mergeState) {
  if (!mergeState.meta(first).hasSameSelectors(mergeState.meta(second)))
    return null;
  appendDeclarations(first, second);
  mergeState.meta(first).setDeclarations(getDecls(first));
  mergeState.forget(second);
  return { first: [first], second: [] };
}

/**
 * Rules that share declarations hand them to a rule of their own.
 *
 * @param {Rule} first
 * @param {Rule} second
 * @param {MergeState} mergeState
 * @return {Placement | null} null when sharing the declarations would not
 * make the output shorter
 */
export function mergeSharedDeclarations(first, second, mergeState) {
  const placement = partialMerge(first, second, mergeState);
  if (!placement) return null;
  // The rules that replace the pair are described afresh when needed.
  mergeState.forget(first);
  mergeState.forget(second);
  return placement;
}
