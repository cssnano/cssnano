import { isConflictingProp } from './propertyRelations.js';

/** @import {Declaration} from 'postcss' */

/**
 * @param {Declaration} a
 * @param {Declaration} b
 * @return {boolean}
 */
function declarationIsEqual(a, b) {
  return (
    a.important === b.important && a.prop === b.prop && a.value === b.value
  );
}

/**
 * @param {Declaration[]} array
 * @param {Declaration} decl
 * @return {number}
 */
export function indexOfDeclaration(array, decl) {
  return array.findIndex((d) => declarationIsEqual(d, decl));
}

/**
 * @param {Declaration[]} a
 * @param {Declaration[]} b
 * @param {boolean} [not=false]
 * @return {Declaration[]}
 */
export function intersect(a, b, not) {
  return a.filter((c) => {
    const index = indexOfDeclaration(b, c) !== -1;
    return not ? !index : index;
  });
}

/**
 * @param {Declaration[]} a
 * @param {Declaration[]} b
 * @return {boolean}
 */
export function sameDeclarationsAndOrder(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((d, index) => declarationIsEqual(d, b[index]));
}

/**
 * @param {Declaration} candidate
 * @param {number} candidateIndex
 * @param {Declaration[]} hoistCandidates
 * @param {Declaration[]} earlierRuleDeclarations
 * @return {boolean}
 */
function hoistingPreservesOverrideOrder(
  candidate,
  candidateIndex,
  hoistCandidates,
  earlierRuleDeclarations
) {
  const indexInEarlierRule = indexOfDeclaration(
    earlierRuleDeclarations,
    candidate
  );
  const overridesInEarlierRule = earlierRuleDeclarations
    .slice(indexInEarlierRule + 1)
    .filter((d) => isConflictingProp(d.prop, candidate.prop));
  if (overridesInEarlierRule.length === 0) {
    return true;
  }
  const overridesAmongCandidates = hoistCandidates
    .slice(candidateIndex + 1)
    .filter((d) => isConflictingProp(d.prop, candidate.prop));
  if (overridesInEarlierRule.length !== overridesAmongCandidates.length) {
    return false;
  }
  return overridesInEarlierRule.every((d, index) =>
    declarationIsEqual(d, overridesAmongCandidates[index])
  );
}

/**
 * @param {Declaration} candidate
 * @param {Declaration[]} laterDeclarations
 * @param {Set<number>} claimedIndices
 * @return {boolean}
 */
function claimMatchInLaterRule(candidate, laterDeclarations, claimedIndices) {
  const matchIndex = laterDeclarations.findIndex(
    (d, index) =>
      !claimedIndices.has(index) && isConflictingProp(d.prop, candidate.prop)
  );
  if (matchIndex === -1) {
    return false;
  }
  if (!declarationIsEqual(laterDeclarations[matchIndex], candidate)) {
    return false;
  }
  if (
    candidate.prop.toLowerCase() !== 'direction' &&
    candidate.prop.toLowerCase() !== 'unicode-bidi' &&
    laterDeclarations.some(
      (declaration) => declaration.prop.toLowerCase() === 'all'
    )
  ) {
    return false;
  }
  claimedIndices.add(matchIndex);
  return true;
}

/**
 * @param {Declaration[]} hoistCandidates
 * @param {Declaration[]} earlierRuleDeclarations
 * @param {Declaration[]} laterRuleDeclarations
 * @return {{intersection: Declaration[], claimedIndices: Set<number>}}
 */
export function filterRuleIntersections(
  hoistCandidates,
  earlierRuleDeclarations,
  laterRuleDeclarations
) {
  let remainingCandidates = hoistCandidates;
  for (;;) {
    const claimedIndices = new Set();
    const survivors = remainingCandidates.filter(
      (candidate, candidateIndex) =>
        hoistingPreservesOverrideOrder(
          candidate,
          candidateIndex,
          remainingCandidates,
          earlierRuleDeclarations
        ) &&
        claimMatchInLaterRule(candidate, laterRuleDeclarations, claimedIndices)
    );
    if (
      survivors.length === remainingCandidates.length ||
      survivors.length === 0
    ) {
      return { intersection: survivors, claimedIndices };
    }
    remainingCandidates = survivors;
  }
}
