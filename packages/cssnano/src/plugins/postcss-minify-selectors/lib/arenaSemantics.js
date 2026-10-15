/** @import {ArenaNode, SemanticFacts, Specificity, SpecificityResult} from './arena.js' */

export const semanticFacts = Object.freeze({
  namespace: 1,
  pseudoElement: 2,
  vendorPseudo: 4,
  nesting: 8,
  attributeModifier: 16,
  commentDescendant: 32,
  nestedHas: 64,
  function: 128,
  unsafePseudo: 256,
});
/** @return {SemanticFacts} */
export function createSemanticFacts() {
  return 0;
}

/** @param {SemanticFacts | undefined} facts @param {number} fact */
export function hasSemanticFact(facts, fact) {
  return (facts ?? 0) % (fact * 2) >= fact;
}

/** @param {SemanticFacts} facts @param {number} fact */
export function addSemanticFact(facts, fact) {
  return hasSemanticFact(facts, fact) ? facts : facts + fact;
}

/** @param {SemanticFacts} left @param {SemanticFacts} right */
export function mergeSemanticFacts(left, right) {
  let merged = left;
  for (let fact = 1; fact <= semanticFacts.unsafePseudo; fact *= 2)
    if (hasSemanticFact(right, fact)) merged = addSemanticFact(merged, fact);
  return merged;
}

/** @type {Specificity} */
export const ZERO_SPECIFICITY = Object.freeze([0, 0, 0]);
export const EMPTY_FACTS = createSemanticFacts();

/** @param {ArenaNode} compound @return {boolean} */
export function isFoldEligible(compound) {
  const facts = compound.facts;
  return (
    compound.kind === 'compound' &&
    compound.status === 'valid' &&
    facts === EMPTY_FACTS
  );
}

/** @return {Specificity} */
export function zeroSpecificity() {
  return ZERO_SPECIFICITY;
}

/** @param {Specificity} a @param {Specificity} b @return {SpecificityResult} */
export function addSpecificity(a, b) {
  /** @type {Specificity} */
  const result = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  if (result.some((component) => !Number.isSafeInteger(component)))
    return { status: 'opaque' };
  return { status: 'valid', specificity: result };
}
