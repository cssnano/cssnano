import cssnanoUtils from 'cssnano-utils';
import { isConflictingProp } from './propertyRelations.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {Declaration} from 'postcss' */

/**
 * The comparison key for a property name. Standard property names are ASCII
 * case-insensitive, so their case folding must match; custom properties are
 * case-sensitive and keep their exact spelling.
 *
 * @param {string} prop
 * @return {string}
 */
export function propertyNameKey(prop) {
  return prop.startsWith('--') ? prop : asciiLowerCase(prop);
}

/**
 * @param {Declaration} a
 * @param {Declaration} b
 * @return {boolean}
 */
export function declarationIsEqual(a, b) {
  return (
    a.important === b.important &&
    propertyNameKey(a.prop) === propertyNameKey(b.prop) &&
    a.value === b.value
  );
}

/**
 * @param {Declaration[]} array
 * @param {Declaration} decl
 * @return {number}
 */
function indexOfDeclaration(array, decl) {
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
 * The hoist candidates are declaration references taken from
 * `earlierRuleDeclarations`, so the candidate's position is found by
 * reference identity. A value-based search would map every duplicate
 * declaration onto the first match and hide overrides that follow it.
 *
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
  const indexInEarlierRule = earlierRuleDeclarations.indexOf(candidate);
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
  const candidateProp = asciiLowerCase(candidate.prop);
  if (
    candidateProp !== 'direction' &&
    candidateProp !== 'unicode-bidi' &&
    // Custom properties are not reset by `all` (CSS Cascading and Inheritance
    // Level 4), so sharing one past an `all` declaration is safe.
    !candidateProp.startsWith('--') &&
    laterDeclarations.some(
      (declaration) => asciiLowerCase(declaration.prop) === 'all'
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
 * @return {{intersection: Declaration[], claimedIndices: Set<number>, claimedEarlierIndices: Set<number>}}
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
      return {
        intersection: survivors,
        claimedIndices,
        // Symmetric to `claimedIndices`: the positions of the surviving
        // declarations within the earlier rule, by reference identity.
        claimedEarlierIndices: new Set(
          survivors.map((d) => earlierRuleDeclarations.indexOf(d))
        ),
      };
    }
    remainingCandidates = survivors;
  }
}
