/** @import {TokenListId} from '../../../ir/tokenLists.js' */
import {
  childCountOf,
  firstDeclaration,
  nextDeclaration,
  declarationsOf,
} from './blockChildren.js';
import { claimRepeats, isDeclarationRule } from './declarationJoin.js';
import { PropertyWrites } from './propertyWrites.js';
import { declarationKeys } from './declarationCache.js';
import { listTextLength, selectorTextLength } from './selectorReads.js';

/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex, BlockRecord} from './blockRecord.js' */
/** @import RuleSequence, {Placement} from './ruleSequence.js' */
/** @import DeclarationScan from './declarationScan.js' */

// How many rules after the pair may join the shared rule. A constant bound
// keeps the search linear in the stylesheet. `findGroup` reads it forward and
// `earliestPairReaching` backward through `PAIR_REACH`, so a change to the
// window or to which rules may join needs both.
export const SHARING_WINDOW = 10;

// How many links back from the last rule that can join a group its pair's
// first rule stands: the pair's second rule and the whole window lie between.
// `earliestPairReaching` walks this far to find every group a rewrite changes.
const PAIR_REACH = SHARING_WINDOW + 1;

/**
 * Whether a declaration of `rule`, other than the `claimed` ones, sets a
 * property of `shared`. Standing after the shared rule, it blocks every later
 * rule from handing over the shared declarations.
 *
 * @param {BlockRecords} records the arena that holds the rule's children
 * @param {RuleRecord} rule
 * @param {Set<ArenaIndex> | null | undefined} claimed the arena indices of the declarations of `rule` that repeat `shared`
 * @param {DeclarationRecord[]} shared
 * @return {boolean}
 */
function overridesShared(records, rule, claimed, shared) {
  const sharedWrites = new PropertyWrites();
  for (const declaration of shared) {
    sharedWrites.record(declaration.keys, 0);
  }
  for (
    let declaration = firstDeclaration(records, rule.index);
    declaration !== undefined;
    declaration = nextDeclaration(records, declaration)
  ) {
    if (claimed?.has(declaration.index)) continue;
    if (sharedWrites.lastConflict(declaration.keys) !== -1) return true;
  }
  return false;
}

/**
 * @typedef {object} Follower
 * @property {ArenaIndex} rule the index of the rule, which the rewrite edits before it reads the rule again
 * @property {Set<ArenaIndex>} claimed the arena indices of the declarations where it repeats the shared declarations
 */

/**
 * @typedef {object} Group
 * @property {Follower[]} followers the rules that join the shared rule
 * @property {TokenListId[]} addedIds the ids of the selectors they add to it, in order
 */

/**
 * Whether the rule at `link` stands among declarations only in `parent`, as
 * the shared rule does, and sets every shared declaration.
 *
 * @param {ArenaIndex | -1} link the index of the rule, -1 for none
 * @param {ArenaIndex | -1} parent the index of the block the rules stand in
 * @param {DeclarationRecord[]} shared the shared declarations
 * @param {BlockRecords} records the arena that holds the rules' blocks
 * @return {boolean}
 */
function repeatsShared(link, parent, shared, records) {
  if (link === -1) return false;
  const rule = /** @type {RuleRecord} */ (records.rule(link));
  if (
    records.links.parentOf(rule.index) !== parent ||
    !isDeclarationRule(records, rule)
  ) {
    return false;
  }
  const { keySet } = declarationKeys(records, rule.index);
  for (const declaration of shared) {
    if (!keySet.has(declaration.id)) return false;
  }
  return true;
}

/**
 * @param {ArenaIndex[]} members the indices of the rules of the group
 * @param {RuleRecord} later
 * @param {ArenaIndex | -1} parent the index of the block the rules stand in
 * @param {import('./mergeState.js').default} mergeState
 * @return {boolean} whether `later` can share a selector list with every member
 */
function mergesWithAll(members, later, parent, mergeState) {
  const { records } = mergeState;
  for (const member of members) {
    const record = /** @type {RuleRecord} */ (records.rule(member));
    if (!mergeState.canMerge(record, later, parent, parent)) return false;
  }
  return true;
}

/**
 * The rules after the pair that join the shared rule: the prefix of the rules
 * that repeat every shared declaration which shortens the output most. A rule
 * that does not pay for its selector may still be worth it for the ones after
 * it.
 *
 * Each rule hands its shared declarations up to the shared rule, across the
 * leftovers of the rules before it, so the run ends at a rule that cannot
 * cross them, or whose leftover sets a shared property and so blocks every
 * rule after it. What a rule saves follows from lengths alone, so those
 * checks run only for a prefix that would pay.
 *
 * @param {RuleRecord} first
 * @param {ArenaIndex} second the index of the later rule of the pair
 * @param {DeclarationRecord[]} shared the shared declarations, in their order in `first`
 * @param {Set<ArenaIndex>} claimedIndices the arena indices of the declarations of `second` that repeat them
 * @param {number} sharedBytes
 * @param {number} prefixed the bytes of the shared declarations a later plugin may remove
 * @param {number} delta how much the pair alone lengthens the output
 * @param {import('./mergeState.js').default} mergeState
 * @param {RuleSequence} sequence
 * @param {DeclarationScan} scan
 * @return {Group | null}
 */
export function findGroup(
  first,
  second,
  shared,
  claimedIndices,
  sharedBytes,
  prefixed,
  delta,
  mergeState,
  sequence,
  scan
) {
  const { records } = mergeState;
  const secondRule = /** @type {RuleRecord} */ (records.rule(second));
  const parent = records.links.parentOf(secondRule.index);
  if (!repeatsShared(sequence.nextOf(second), parent, shared, records))
    return null;
  if (overridesShared(records, secondRule, claimedIndices, shared)) return null;

  const listed = new Set(first.selectorIds);
  for (const id of secondRule.selectorIds) listed.add(id);
  /** @type {TokenListId[]} the ids of the selectors the group adds, in order of first use */
  const addedIds = [];
  /** @type {number[]} */
  const candidates = [];
  /** @type {Follower[]} */
  const followers = [];
  const members = [first.index, secondRule.index];
  let blocked = false;
  let best = delta;
  let size = 0;
  let addedAtBest = 0;
  let running = delta;
  for (
    let link = sequence.nextOf(second), seen = 0;
    seen < SHARING_WINDOW && repeatsShared(link, parent, shared, records);
    link = sequence.nextOf(link), seen++
  ) {
    const linked = /** @type {RuleRecord} */ (records.rule(link));
    const ids = linked.selectorIds;
    for (let at = 0; at < ids.length; at++) {
      if (listed.has(ids[at])) continue;
      listed.add(ids[at]);
      addedIds.push(ids[at]);
      running += 1 + selectorTextLength(mergeState.tokenLists, ids[at]);
    }
    running -= sharedBytes;
    if (childCountOf(records, linked.index) === shared.length) {
      running -= listTextLength(mergeState.tokenLists, ids) + 1;
    }
    candidates.push(link);
    // Every member repeats the prefixed declarations, which a later plugin
    // may remove from each rule, so the group must pay off without them.
    if (running >= best || running + (candidates.length + 2) * prefixed >= 0) {
      continue;
    }
    // Check, in order, the rules up to this one that are not checked yet.
    while (!blocked && followers.length < candidates.length) {
      const index = followers.length;
      const candidate = candidates[index];
      const later = /** @type {RuleRecord} */ (records.rule(candidate));
      const claimed = claimedBy(shared, later, records);
      const previous = index ? candidates[index - 1] : second;
      if (
        !claimed ||
        scan.declarationBetween(
          records,
          /** @type {RuleRecord} */ (records.rule(previous)),
          later
        ) ||
        !mergesWithAll(members, later, parent, mergeState)
      ) {
        break;
      }
      followers.push({ rule: later.index, claimed });
      members.push(later.index);
      blocked = overridesShared(records, later, claimed, shared);
    }
    if (followers.length < candidates.length) break;
    best = running;
    size = candidates.length;
    addedAtBest = addedIds.length;
    if (blocked) break;
  }
  if (size === 0) return null;
  return {
    followers: followers.slice(0, size),
    addedIds: addedIds.slice(0, addedAtBest),
  };
}

/**
 * The arena indices of the declarations of `later` that repeat `shared`, or
 * null when `later` cannot join: a rule that nests never joins.
 *
 * @param {DeclarationRecord[]} shared
 * @param {RuleRecord} later
 * @param {BlockRecords} records
 * @return {Set<ArenaIndex> | null}
 */
function claimedBy(shared, later, records) {
  return later.context !== -1
    ? null
    : claimRepeats(shared, declarationsOf(records, later.index));
}

/**
 * Keeps in `scratch` only the keys that `keySet` holds, compacting in place.
 *
 * @param {number[]} scratch
 * @param {ReadonlySet<number>} keySet
 * @return {void}
 */
function keepKeysIn(scratch, keySet) {
  let kept = 0;
  for (const key of scratch) {
    if (keySet.has(key)) scratch[kept++] = key;
  }
  scratch.length = kept;
}

/**
 * Records in `earliest` the farthest pair before `resume` that a rewrite at
 * `link` can change, if it is farther than the recorded pair. A later rule
 * joins a group only by repeating the shared declarations, so the walk stops
 * at the first rule that breaks that run or after `PAIR_REACH` links.
 *
 * @param {RuleSequence} sequence
 * @param {ArenaIndex} link the index of a rule that a rewrite placed
 * @param {ArenaIndex | -1} resume the sweep's resume point; only pairs before it count
 * @param {number} offset how many links `link` stands after the first new rule
 * @param {number[]} scratch the declaration keys still shared by the walk
 * @param {import('./mergeState.js').default} mergeState
 * @param {{link: ArenaIndex | -1, distance: number}} earliest the best pair so far, as
 * the index of its earlier rule, and its distance in links from the first new rule
 * @return {void}
 */
export function earliestPairReaching(
  sequence,
  link,
  resume,
  offset,
  scratch,
  mergeState,
  earliest
) {
  const { records } = mergeState;
  const linked = /** @type {RuleRecord} */ (records.rule(link));
  const parent = records.links.parentOf(linked.index);
  let passed = false;
  let member = link;
  for (let depth = 1; ; depth++) {
    const prev = sequence.prevOf(member);
    if (prev === -1) break;
    const prevRule = /** @type {RuleRecord} */ (records.rule(prev));
    const other = declarationKeys(records, prevRule.index);
    if (depth === 1) {
      // Seed from the smaller key list, which bounds the first intersection.
      const own = declarationKeys(records, linked.index);
      const [from, to] =
        own.kept.length <= other.kept.length ? [own, other] : [other, own];
      scratch.length = 0;
      for (const index of from.kept) {
        const key = /** @type {DeclarationRecord} */ (records.entry(index)).id;
        if (to.keySet.has(key)) scratch.push(key);
      }
    } else {
      keepKeysIn(scratch, other.keySet);
    }
    if (scratch.length === 0) break;
    // Walking back, the links past `resume` are earlier than it.
    if (passed) {
      const distance = depth - offset;
      if (earliest.link === -1 || distance > earliest.distance) {
        earliest.link = prev;
        earliest.distance = distance;
      }
    }
    if (prev === resume) passed = true;
    if (depth >= PAIR_REACH || records.links.parentOf(prev) !== parent) break;
    member = prev;
  }
}
