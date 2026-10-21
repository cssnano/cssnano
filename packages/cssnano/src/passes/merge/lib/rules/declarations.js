import cssnanoUtils from '#utils';
import { hackPrefixOf } from '../../../ir/declarationKey.js';
import { isAllName, propertyNameKey } from '../../../ir/propertyName.js';
import { PropertyWrites } from './lastWriteIndex.js';
import { WritePositions } from './writePositions.js';
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */

const { asciiLowerCase } = cssnanoUtils;

/** @import {Declaration} from 'postcss' */

/**
 * @param {Declaration} a
 * @param {Declaration} b
 * @return {boolean}
 */
export function declarationIsEqual(a, b) {
  return (
    a.important === b.important &&
    propertyNameKey(a.prop) === propertyNameKey(b.prop) &&
    a.value === b.value &&
    hackPrefixOf(a) === hackPrefixOf(b)
  );
}

/**
 * The declarations of `declarations` whose key is in `keySet`, in their order.
 *
 * @param {Declaration[]} declarations
 * @param {Set<number>} keySet the keys of the other rule's declarations
 * @param {(declaration: Declaration) => number} keyOf
 * @return {Declaration[]}
 */
export function intersect(declarations, keySet, keyOf) {
  return declarations.filter((declaration) => keySet.has(keyOf(declaration)));
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
 * True if a declaration of `prop` can be reset by `all`, which resets every
 * property but `direction`, `unicode-bidi` and custom properties (CSS Cascading
 * and Inheritance Level 4).
 *
 * @param {string} prop
 * @return {boolean}
 */
function resettableByAll(prop) {
  const lowercased = asciiLowerCase(prop);
  return (
    lowercased !== 'direction' &&
    lowercased !== 'unicode-bidi' &&
    !lowercased.startsWith('--')
  );
}

/**
 * The later rule's declarations, matched one candidate at a time. Each
 * candidate claims the first unclaimed later declaration whose property
 * conflicts with it, and the claim must be an equal declaration.
 */
class LaterClaims {
  /** @type {Declaration[]} */
  #declarations;
  /** @type {WritePositions} */
  #writes;
  /** @type {Set<number>} */
  #claimed = new Set();
  #hasAll = false;

  /**
   * @param {Declaration[]} declarations
   * @param {PropertyTable} table
   */
  constructor(declarations, table) {
    this.#declarations = declarations;
    this.#writes = new WritePositions(table);
    for (let index = 0; index < declarations.length; index++) {
      this.#writes.record(declarations[index], index);
      if (isAllName(declarations[index].prop)) {
        this.#hasAll = true;
      }
    }
  }

  /** @return {Set<number>} the positions claimed so far */
  get claimed() {
    return this.#claimed;
  }

  /**
   * @param {Declaration} candidate
   * @return {boolean} whether the candidate claims an equal later declaration
   */
  claim(candidate) {
    // Both refusals below would fail the claim after the query, so skipping
    // the query changes no answer.
    if (
      isAllName(candidate.prop) ||
      (this.#hasAll && resettableByAll(candidate.prop))
    ) {
      return false;
    }
    const matchIndex = this.#writes.firstUnclaimed(candidate, this.#claimed);
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
 * @param {Declaration[]} candidates
 * @param {Declaration[]} earlierRuleDeclarations
 * @param {Declaration[]} laterRuleDeclarations
 * @param {PropertyTable} table
 * @return {{survivors: Declaration[], claimedIndices: Set<number>, earlierIndices: Set<number>}}
 */
function filterRound(
  candidates,
  earlierRuleDeclarations,
  laterRuleDeclarations,
  table
) {
  const candidateSet = new Set(candidates);
  /** @type {Map<Declaration, number>} */
  const earlierIndexOf = new Map();
  const hoistable = new Set();
  // The non-candidates after the current position. A candidate is blocked by
  // any of them that conflicts with it.
  const outside = new PropertyWrites(table);
  for (let index = earlierRuleDeclarations.length - 1; index >= 0; index--) {
    const declaration = earlierRuleDeclarations[index];
    if (!candidateSet.has(declaration)) {
      outside.record(declaration, index);
      continue;
    }
    earlierIndexOf.set(declaration, index);
    if (outside.lastConflict(declaration) === -1) {
      hoistable.add(declaration);
    }
  }

  const claims = new LaterClaims(laterRuleDeclarations, table);
  /** @type {Declaration[]} */
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
        (declaration) => /** @type {number} */ (earlierIndexOf.get(declaration))
      )
    ),
  };
}

/**
 * @param {Declaration[]} hoistCandidates
 * @param {Declaration[]} earlierRuleDeclarations
 * @param {Declaration[]} laterRuleDeclarations
 * @param {PropertyTable} table
 * @return {{intersection: Declaration[], claimedIndices: Set<number>, claimedEarlierIndices: Set<number>}}
 */
export function filterRuleIntersections(
  hoistCandidates,
  earlierRuleDeclarations,
  laterRuleDeclarations,
  table
) {
  let remainingCandidates = hoistCandidates;
  for (;;) {
    const round = filterRound(
      remainingCandidates,
      earlierRuleDeclarations,
      laterRuleDeclarations,
      table
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
