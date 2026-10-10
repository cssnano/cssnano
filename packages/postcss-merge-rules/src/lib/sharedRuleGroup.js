import { claimRepeats, isDeclarationRule } from './declarationJoin.js';
import { isConflictingProp } from './propertyRelations.js';

/** @import {ChildNode, Container, Declaration, Rule} from 'postcss' */
/** @import RuleSequence, {Placement, RuleLink} from './ruleSequence.js' */

/** @param {string[]} selectors @return {number} */
export function selectorsLength(selectors) {
  let total = selectors.length - 1;
  for (const selector of selectors) total += selector.length;
  return total;
}

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
 * Whether a declaration among `nodes`, other than the `claimed` ones, sets a
 * property of `shared`. Standing after the shared rule, it blocks every
 * later rule from handing over the shared declarations.
 *
 * @param {ChildNode[]} nodes
 * @param {Set<number> | null} claimed positions among the declarations
 * @param {Declaration[]} shared
 * @return {boolean}
 */
function overridesShared(nodes, claimed, shared) {
  let position = 0;
  for (const node of nodes) {
    if (node.type !== 'decl' || claimed?.has(position++)) continue;
    for (const declaration of shared) {
      if (isConflictingProp(node.prop, declaration.prop)) return true;
    }
  }
  return false;
}

/**
 * @typedef {object} Follower
 * @property {Rule} rule
 * @property {Set<number>} claimed where it repeats the shared declarations
 */

/**
 * @typedef {object} Group
 * @property {Follower[]} followers the rules that join the shared rule
 * @property {string[]} added the selectors they add to it
 */

/**
 * Whether the rule at `link` stands among declarations only in `parent`, as
 * the shared rule does, and sets every shared declaration.
 *
 * @param {RuleLink | null} link
 * @param {Container} parent
 * @param {number[]} firstKeys the declaration keys of the earlier rule
 * @param {Set<number>} sharedIndices where the shared declarations stand in it
 * @param {import('./mergeState.js').default} mergeState
 * @return {link is RuleLink}
 */
function repeatsShared(link, parent, firstKeys, sharedIndices, mergeState) {
  if (!link || link.slot.parent !== parent || !isDeclarationRule(link.rule)) {
    return false;
  }
  const { keySet } = mergeState.declarationKeysOf(link.rule);
  for (const index of sharedIndices) {
    if (!keySet.has(firstKeys[index])) return false;
  }
  return true;
}

/**
 * @param {Rule[]} members
 * @param {Rule} later
 * @param {Container} parent
 * @param {import('./mergeState.js').default} mergeState
 * @return {boolean} whether `later` can share a selector list with every member
 */
function mergesWithAll(members, later, parent, mergeState) {
  for (const member of members) {
    if (!mergeState.canMerge(member, later, parent, parent)) return false;
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
 * @param {Rule} first
 * @param {RuleLink} second
 * @param {Set<number>} claimedEarlierIndices where the shared declarations stand in `first`
 * @param {Set<number>} claimedIndices where they stand in `second`
 * @param {number} sharedBytes
 * @param {number} prefixed the bytes of the shared declarations a later plugin may remove
 * @param {number} delta how much the pair alone lengthens the output
 * @param {import('./mergeState.js').default} mergeState
 * @param {RuleSequence} sequence
 * @param {WeakMap<Container, boolean>} outsideDeclarations
 * @return {Group | null}
 */
export function findGroup(
  first,
  second,
  claimedEarlierIndices,
  claimedIndices,
  sharedBytes,
  prefixed,
  delta,
  mergeState,
  sequence,
  outsideDeclarations
) {
  const parent = second.slot.parent;
  const firstKeys = mergeState.declarationKeysOf(first).keys;
  if (
    !repeatsShared(
      second.next,
      parent,
      firstKeys,
      claimedEarlierIndices,
      mergeState
    )
  )
    return null;
  const shared = mergeState
    .meta(first)
    .declarations.filter((_, index) => claimedEarlierIndices.has(index));
  if (overridesShared(second.rule.nodes, claimedIndices, shared)) return null;

  const listed = new Set(mergeState.meta(first).selectors);
  for (const selector of mergeState.meta(second.rule).selectors) {
    listed.add(selector);
  }
  const listedBefore = listed.size;
  /** @type {RuleLink[]} */
  const candidates = [];
  /** @type {Follower[]} */
  const followers = [];
  const members = [first, second.rule];
  let blocked = false;
  let best = delta;
  let size = 0;
  let listedAtBest = listedBefore;
  let running = delta;
  for (
    let link = /** @type {RuleLink | null} */ (second.next), seen = 0;
    seen < SHARING_WINDOW &&
    repeatsShared(link, parent, firstKeys, claimedEarlierIndices, mergeState);
    link = link.next, seen++
  ) {
    const selectors = mergeState.meta(link.rule).selectors;
    for (const selector of selectors) {
      if (listed.has(selector)) continue;
      listed.add(selector);
      running += 1 + selector.length;
    }
    running -= sharedBytes;
    if (link.rule.nodes.length === shared.length) {
      running -= selectorsLength(selectors) + 1;
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
      const later = candidate.rule;
      const claimed = claimRepeats(
        shared,
        /** @type {Declaration[]} */ (later.nodes)
      );
      if (
        !claimed ||
        sequence.declarationBetween(
          index ? candidates[index - 1] : second,
          candidate,
          outsideDeclarations
        ) ||
        !mergesWithAll(members, later, parent, mergeState)
      ) {
        break;
      }
      followers.push({ rule: later, claimed });
      members.push(later);
      blocked = overridesShared(later.nodes, claimed, shared);
    }
    if (followers.length < candidates.length) break;
    best = running;
    size = candidates.length;
    listedAtBest = listed.size;
    if (blocked) break;
  }
  if (size === 0) return null;
  return {
    followers: followers.slice(0, size),
    added: [...listed].slice(listedBefore, listedAtBest),
  };
}

/**
 * Keeps in `scratch` only the keys that `keySet` holds, compacting in place.
 *
 * @param {number[]} scratch
 * @param {Set<number>} keySet
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
 * @param {RuleLink} link a rule that a rewrite placed
 * @param {RuleLink} resume the sweep's resume point; only pairs before it count
 * @param {number} offset how many links `link` stands after the first new rule
 * @param {number[]} scratch the declaration keys still shared by the walk
 * @param {import('./mergeState.js').default} mergeState
 * @param {{link: RuleLink | null, distance: number}} earliest the best pair so
 * far, and its distance in links from the first new rule
 * @return {void}
 */
export function earliestPairReaching(
  link,
  resume,
  offset,
  scratch,
  mergeState,
  earliest
) {
  const parent = link.slot.parent;
  const own = mergeState.declarationKeysOf(link.rule);
  let passed = false;
  let member = link;
  for (let depth = 1; ; depth++) {
    const prev = /** @type {RuleLink} */ (member.prev);
    if (!prev.rule) break;
    const other = mergeState.declarationKeysOf(prev.rule);
    if (depth === 1) {
      // Seed from the smaller key list, which bounds the first intersection.
      const [from, to] =
        own.keys.length <= other.keys.length ? [own, other] : [other, own];
      scratch.length = 0;
      for (const key of from.keys) {
        if (to.keySet.has(key)) scratch.push(key);
      }
    } else {
      keepKeysIn(scratch, other.keySet);
    }
    if (scratch.length === 0) break;
    // Walking back, the links past `resume` are earlier than it.
    if (passed) {
      const distance = depth - offset;
      if (!earliest.link || distance > earliest.distance) {
        earliest.link = prev;
        earliest.distance = distance;
      }
    }
    if (prev === resume) passed = true;
    if (depth >= PAIR_REACH || prev.slot.parent !== parent) break;
    member = prev;
  }
}
