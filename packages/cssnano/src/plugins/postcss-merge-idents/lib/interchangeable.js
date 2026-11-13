import { compareAtRulePriority } from './layerRegistry.js';
import { createReplacement } from './valueRewriter.js';
import { bodyId } from '../../../passes/ir/structuralIds.js';

/** @import {ArenaIndex} from '../../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../passes/ir/blockRecords.js' */
/** @import {DeclarationKeys} from '../../../passes/ir/declarationKey.js' */

/**
 * @typedef {Array<{ name: string, copies: AtRuleEntry[] }>} Group names that
 *   are defined in the same at-rules and containers with the same body
 *
 * @typedef {{
 *   rule: ArenaIndex,
 *   body?: number,
 *   layerPriority: number[],
 *   documentIndex: number,
 *   family: string,
 *   containerId: number,
 *   layerKey?: string,
 *   parsed: { isString: boolean, isReservedName: boolean, key: string, tokenText: string }
 * }} AtRuleEntry
 */

/**
 * The structural id of an entry's body, computed on first use.
 *
 * @param {BlockRecords} records
 * @param {DeclarationKeys} keys
 * @param {AtRuleEntry} entry
 * @return {number}
 */
function bodyOf(records, keys, entry) {
  if (entry.body === undefined) entry.body = bodyId(keys, records, entry.rule);
  return entry.body;
}

/**
 * @param {AtRuleEntry[]} entries
 * @return {AtRuleEntry}
 */
function highestPriority(entries) {
  let best = entries[0];
  for (const entry of entries) {
    if (compareAtRulePriority(best, entry) < 0) {
      best = entry;
    }
  }
  return best;
}

/**
 * Every name of a group behaves alike, so the cascade priority does not
 * matter for correctness; the shortest spelling minimizes output size and
 * priority breaks ties.
 *
 * @param {AtRuleEntry[]} entries
 * @return {AtRuleEntry}
 */
function shortestSpelling(entries) {
  const shortest = Math.min(
    ...entries.map(({ parsed }) => parsed.tokenText.length)
  );
  return highestPriority(
    entries.filter(({ parsed }) => parsed.tokenText.length === shortest)
  );
}

/**
 * Removes repeat definitions of one name that share a body and a condition
 * container, keeping the one that wins the cascade: the kept definition is
 * present whenever a removed one is.
 *
 * @param {BlockRecords} records
 * @param {DeclarationKeys} keys
 * @param {AtRuleEntry[]} copies definitions of one name
 * @param {Set<ArenaIndex>} removals
 * @return {AtRuleEntry[]} the definitions that remain
 */
function collapseSameNameCopies(records, keys, copies, removals) {
  if (copies.length < 2) {
    return copies;
  }
  for (const group of Map.groupBy(copies, placementOf).values()) {
    const body = bodyOf(records, keys, group[0]);
    if (
      group.length < 2 ||
      !group.every((copy) => bodyOf(records, keys, copy) === body)
    ) {
      continue;
    }
    const survivor = highestPriority(group);
    for (const copy of group) {
      if (copy !== survivor) {
        removals.add(copy.rule);
      }
    }
  }
  return copies.filter((copy) => !removals.has(copy.rule));
}

/**
 * @param {AtRuleEntry} entry
 * @return {string} the at-rule family and condition container defining it,
 *   and its layer when the layer order is not known
 */
function placementOf(entry) {
  return `${entry.family}@${entry.containerId}${entry.layerKey ?? ''}`;
}

/**
 * Makes each name of a group of interchangeable names, except the one that
 * wins the cascade, refer to the winner. A name that substituted text may
 * spell keeps its definition and is preferred as the merge target.
 *
 * @param {Group} group
 * @param {Set<string>} protectedNames
 * @param {Map<string, import('./valueRewriter.js').Replacement>} renames
 * @param {Set<ArenaIndex>} removals
 * @return {void}
 */
function mergeInterchangeable(group, protectedNames, renames, removals) {
  const protectedMembers = group.filter(({ name }) => protectedNames.has(name));
  const targetCandidates = (
    protectedMembers.length > 0 ? protectedMembers : group
  ).flatMap(({ copies }) => copies);
  // An identifier reference is shorter than a string and more widely
  // supported as a keyframes name.
  const identifiers = targetCandidates.filter(({ parsed }) => !parsed.isString);
  const target = shortestSpelling(
    identifiers.length > 0 ? identifiers : targetCandidates
  );
  const replacement = createReplacement(target.parsed);
  for (const { name, copies } of group) {
    if (name === target.parsed.key || protectedNames.has(name)) {
      continue;
    }
    renames.set(name, replacement);
    for (const copy of copies) {
      removals.add(copy.rule);
    }
  }
}

/**
 * Finds the groups of interchangeable names of one namespace and removes
 * repeat definitions of a single name. Two names are interchangeable when
 * their definitions, in cascade order, sit in the same at-rule families and
 * condition containers with the same bodies: whichever definition a browser
 * picks for one name, it picks the same body for the other. This lets
 * `@-webkit-keyframes` and `@keyframes` pairs merge although their bodies
 * differ. A string and an ident of one value are one name. Bodies are
 * serialized only for names that share where they are defined.
 *
 * @param {BlockRecords} records
 * @param {DeclarationKeys} keys
 * @param {AtRuleEntry[]} entries
 * @param {Set<ArenaIndex>} removals
 * @return {Group[]} groups of two or more names
 */
function findInterchangeableGroups(records, keys, entries, removals) {
  if (entries.length < 2) {
    return [];
  }

  /** @type {Group} */
  const candidates = [];
  for (const [name, all] of Map.groupBy(entries, ({ parsed }) => parsed.key)) {
    const copies = collapseSameNameCopies(records, keys, all, removals);
    if (!copies.some(({ parsed }) => parsed.isReservedName)) {
      candidates.push({ name, copies: copies.toSorted(compareAtRulePriority) });
    }
  }

  /** @type {Group[]} */
  const groups = [];
  const bySites = Map.groupBy(candidates, ({ copies }) =>
    copies.map(placementOf).join(' ')
  );
  for (const sameSites of bySites.values()) {
    if (sameSites.length < 2) {
      continue;
    }
    const byBodies = Map.groupBy(sameSites, ({ copies }) =>
      copies.map((copy) => bodyOf(records, keys, copy)).join(',')
    );
    for (const sameBodies of byBodies.values()) {
      if (sameBodies.length > 1) {
        groups.push(sameBodies);
      }
    }
  }
  return groups;
}

export { findInterchangeableGroups, mergeInterchangeable };
