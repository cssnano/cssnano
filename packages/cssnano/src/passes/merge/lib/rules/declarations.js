import { PropertyWrites } from './propertyWrites.js';
import { Claims, WritePositions } from './writePositions.js';
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {BlockRecords} from '../../../ir/blockRecords.js' */
/** @import {ArenaIndex, ChainPosition} from '../../../ir/blockRecord.js' */

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
 * @param {ReadonlySet<number>} keySet the ids of the other rule's declarations
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
 * @param {BlockRecords} records the arena that holds both rules' declarations
 * @param {readonly ArenaIndex[]} a the declarations of a rule, in order
 * @param {readonly ArenaIndex[]} b
 * @return {boolean}
 */
export function sameDeclarationsAndOrder(records, a, b) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every(
    (index, at) =>
      /** @type {DeclarationRecord} */ (records.entry(index)).id ===
      /** @type {DeclarationRecord} */ (records.entry(b[at])).id
  );
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
  /** @type {Claims} the positions this claimer claimed, with its cursors */
  #claims = new Claims();
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
    return /** @type {Set<ChainPosition>} */ (this.#claims.claimed);
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
      this.#writes.firstUnclaimed(keys, this.#claims)
    );
    if (matchIndex === -1) {
      return false;
    }
    if (!declarationIsEqual(this.#declarations[matchIndex], candidate)) {
      return false;
    }
    this.#claims.claimed.add(matchIndex);
    return true;
  }
}

/**
 * One round of `filterRuleIntersections`, against the candidates it was given.
 *
 * A candidate keeps the override order when no declaration after it in the
 * earlier rule that is not a candidate conflicts with it. The candidates are
 * the earlier rule's declarations by reference, in their chain order, so one
 * backward pass over the earlier rule decides every candidate.
 *
 * @param {DeclarationRecord[]} candidates in the earlier rule's chain order
 * @param {DeclarationRecord[]} earlierRuleDeclarations
 * @param {DeclarationRecord[]} laterRuleDeclarations
 * @return {{survivors: DeclarationRecord[], claimed: Set<ChainPosition>}} the
 * surviving candidates in their order, and the positions in the later rule
 * that they claim
 */
function filterRound(
  candidates,
  earlierRuleDeclarations,
  laterRuleDeclarations
) {
  /** @type {boolean[]} whether each candidate has no conflicting outside write after it */
  const hoistable = [];
  // The non-candidates after the current position. A candidate is blocked by
  // any of them that conflicts with it.
  const outside = new PropertyWrites();
  // The cursor walks down the candidates as the earlier rule's declarations
  // are passed, so each candidate is matched by reference.
  let cursor = candidates.length - 1;
  for (let index = earlierRuleDeclarations.length - 1; index >= 0; index--) {
    const declaration = earlierRuleDeclarations[index];
    if (cursor >= 0 && declaration === candidates[cursor]) {
      hoistable[cursor] = outside.lastConflict(declaration.keys) === -1;
      cursor--;
      continue;
    }
    outside.record(declaration.keys, index);
  }
  if (cursor !== -1) {
    throw new Error('filterRound: a candidate is not in the earlier rule');
  }

  const claims = new LaterClaims(laterRuleDeclarations);
  /** @type {DeclarationRecord[]} */
  const survivors = [];
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    if (hoistable[index] && claims.claim(candidate)) {
      survivors.push(candidate);
    }
  }
  return { survivors, claimed: claims.claimed };
}

/**
 * @param {DeclarationRecord[]} hoistCandidates in the earlier rule's chain order
 * @param {DeclarationRecord[]} earlierRuleDeclarations
 * @param {DeclarationRecord[]} laterRuleDeclarations
 * @return {{intersection: DeclarationRecord[], claimedIndices: Set<ArenaIndex>}}
 * `intersection` lists the surviving declarations in the earlier rule's chain
 * order, and `claimedIndices` the arena indices of the later rule's declarations
 * that they claim
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
      /** @type {Set<ArenaIndex>} */
      const claimedIndices = new Set();
      for (const position of round.claimed) {
        claimedIndices.add(laterRuleDeclarations[position].index);
      }
      return { intersection: round.survivors, claimedIndices };
    }
    remainingCandidates = round.survivors;
  }
}
