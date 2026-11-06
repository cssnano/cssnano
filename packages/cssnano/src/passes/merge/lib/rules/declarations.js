import { PropertyWrites } from './propertyWrites.js';
import { WritePositions } from './writePositions.js';
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {ChainPosition} from './blockRecord.js' */

/**
 * Two declarations are equal when they print the same, which their ids tell:
 * the same property name, value, importance and hack prefix.
 *
 * @param {DeclarationRecord} a
 * @param {DeclarationRecord} b
 * @return {boolean}
 */
export function declarationIsEqual(a, b) {
  return a.id === b.id;
}

/**
 * The declarations of `declarations` whose id is in `keySet`, in their order.
 *
 * @param {DeclarationRecord[]} declarations
 * @param {Set<number>} keySet the ids of the other rule's declarations
 * @return {DeclarationRecord[]}
 */
export function intersect(declarations, keySet) {
  return declarations.filter((declaration) => keySet.has(declaration.id));
}

/**
 * Whether two rules hold equal declarations in the same order. Equal
 * declarations share an id, as `declarationIsEqual` states, so the ids of
 * each rule's declarations decide it.
 *
 * @param {number[]} a the ids of the declarations of a rule, in order
 * @param {number[]} b
 * @return {boolean}
 */
export function sameDeclarationsAndOrder(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((id, index) => id === b[index]);
}

/**
 * The later rule's declarations, matched one candidate at a time. Each
 * candidate claims the first unclaimed later declaration whose property
 * conflicts with it, and the claim must be an equal declaration.
 */
class LaterClaims {
  /** @type {DeclarationRecord[]} */
  #declarations;
  /** @type {WritePositions} */
  #writes;
  /** @type {Set<ChainPosition>} */
  #claimed = new Set();
  #hasAll = false;

  /** @param {DeclarationRecord[]} declarations */
  constructor(declarations) {
    this.#declarations = declarations;
    this.#writes = new WritePositions();
    for (let index = 0; index < declarations.length; index++) {
      const { keys } = declarations[index];
      this.#writes.record(keys, index);
      if (!keys.custom && keys.all) this.#hasAll = true;
    }
  }

  /** @return {Set<ChainPosition>} the positions claimed so far */
  get claimed() {
    return this.#claimed;
  }

  /**
   * @param {DeclarationRecord} candidate
   * @return {boolean} whether the candidate claims an equal later declaration
   */
  claim(candidate) {
    // `all` is never claimed, and neither is a property that a later `all`
    // resets. Refusing either before the query changes no answer.
    const { keys } = candidate;
    if (!keys.custom && (keys.all || (this.#hasAll && keys.subjectToAll))) {
      return false;
    }
    const matchIndex = /** @type {ChainPosition | -1} */ (
      this.#writes.firstUnclaimed(keys, this.#claimed)
    );
    if (matchIndex === -1) {
      return false;
    }
    if (!declarationIsEqual(this.#declarations[matchIndex], candidate)) {
      return false;
    }
    this.#claimed.add(matchIndex);
    return true;
  }
}

/**
 * One round of `filterRuleIntersections`, against the candidates it was given.
 *
 * A candidate keeps the override order when no declaration after it in the
 * earlier rule that is not a candidate conflicts with it. The candidates are
 * the earlier rule's declarations by reference, so this one backward pass
 * decides every candidate.
 *
 * @param {DeclarationRecord[]} candidates
 * @param {DeclarationRecord[]} earlierRuleDeclarations
 * @param {DeclarationRecord[]} laterRuleDeclarations
 * @return {{survivors: DeclarationRecord[], claimedIndices: Set<ChainPosition>, earlierIndices: Set<ChainPosition>}}
 */
function filterRound(
  candidates,
  earlierRuleDeclarations,
  laterRuleDeclarations
) {
  const candidateSet = new Set(candidates);
  /** @type {Map<DeclarationRecord, ChainPosition>} */
  const earlierIndexOf = new Map();
  const hoistable = new Set();
  // The non-candidates after the current position. A candidate is blocked by
  // any of them that conflicts with it.
  const outside = new PropertyWrites();
  for (let index = earlierRuleDeclarations.length - 1; index >= 0; index--) {
    const declaration = earlierRuleDeclarations[index];
    if (!candidateSet.has(declaration)) {
      outside.record(declaration.keys, index);
      continue;
    }
    earlierIndexOf.set(declaration, /** @type {ChainPosition} */ (index));
    if (outside.lastConflict(declaration.keys) === -1) {
      hoistable.add(declaration);
    }
  }

  const claims = new LaterClaims(laterRuleDeclarations);
  /** @type {DeclarationRecord[]} */
  const survivors = [];
  for (const candidate of candidates) {
    if (hoistable.has(candidate) && claims.claim(candidate)) {
      survivors.push(candidate);
    }
  }
  return {
    survivors,
    claimedIndices: claims.claimed,
    earlierIndices: new Set(
      survivors.map(
        (declaration) =>
          /** @type {ChainPosition} */ (earlierIndexOf.get(declaration))
      )
    ),
  };
}

/**
 * @param {DeclarationRecord[]} hoistCandidates
 * @param {DeclarationRecord[]} earlierRuleDeclarations
 * @param {DeclarationRecord[]} laterRuleDeclarations
 * @return {{intersection: DeclarationRecord[], claimedIndices: Set<ChainPosition>, claimedEarlierIndices: Set<ChainPosition>}}
 */
export function filterRuleIntersections(
  hoistCandidates,
  earlierRuleDeclarations,
  laterRuleDeclarations
) {
  let remainingCandidates = hoistCandidates;
  for (;;) {
    const round = filterRound(
      remainingCandidates,
      earlierRuleDeclarations,
      laterRuleDeclarations
    );
    if (
      round.survivors.length === remainingCandidates.length ||
      round.survivors.length === 0
    ) {
      return {
        intersection: round.survivors,
        claimedIndices: round.claimedIndices,
        // Symmetric to `claimedIndices`: the positions of the surviving
        // declarations within the earlier rule.
        claimedEarlierIndices: round.earlierIndices,
      };
    }
    remainingCandidates = round.survivors;
  }
}
