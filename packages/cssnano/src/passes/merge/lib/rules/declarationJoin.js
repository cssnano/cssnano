/** @import {TokenListId} from '../../../ir/tokenLists.js' */
import {
  childCountOf,
  holdsOnlyDeclarationsOf,
  childEntriesOf,
  declarationsOf,
} from './blockChildren.js';
import { minifiedLength } from '../../../ir/minifiedLength.js';
import LastWriteIndex from './lastWriteIndex.js';
import RepeatScan from './repeatScan.js';
import { filterRuleIntersections } from './declarations.js';
import { isKeyframes } from './sameContainer.js';
import { removeRules } from './treeEdits.js';
import { RULE } from './blockRecord.js';
import { removeDeclarations } from './arenaEdits.js';
import { declarationKeys } from './declarationCache.js';
import { elementKeysOf, listTextLength } from './selectorReads.js';
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {TokenLists} from '../../../ir/tokenLists.js' */

/** @import MergeState from './mergeState.js' */
/** @import {ArenaIndex, BlockRecord, ChainPosition} from './blockRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

/**
 * A rule made only of declarations. Comments and nested rules would be
 * stranded or reordered by moving declarations out of the rule.
 *
 * @param {BlockRecords} records the arena that holds the rule's children
 * @param {RuleRecord} record
 * @return {boolean}
 */
export const isDeclarationRule = (records, record) =>
  record.context === -1 &&
  childCountOf(records, record.index) > 0 &&
  holdsOnlyDeclarationsOf(records, record.index);

/**
 * The arena indices of the declarations in `later` that repeat every one of
 * `declarations`, or null when a repeat does not stand first for its
 * property, since removing it would then change what `later` sets.
 *
 * @param {DeclarationRecord[]} declarations
 * @param {DeclarationRecord[]} later
 * @return {Set<ArenaIndex> | null} the arena indices of the later declarations
 */
export function claimRepeats(declarations, later) {
  const { intersection, claimedIndices } = filterRuleIntersections(
    declarations,
    declarations,
    later
  );
  return intersection.length === declarations.length ? claimedIndices : null;
}

/**
 * The length of a list of selectors in the output: each selector and a comma
 * after it.
 *
 * @param {TokenLists} tokenLists
 * @param {readonly TokenListId[]} ids
 * @return {number}
 */
function listLength(tokenLists, ids) {
  return listTextLength(tokenLists, ids) + 1;
}

/**
 * @typedef {object} Group
 * @property {RuleRecord} rule
 * @property {ChainPosition} position its place among the live entries of the block
 * @property {DeclarationRecord[]} declarations
 * @property {Set<number> | null} selectors the ids of the listed selectors, built on demand
 * @property {number} bytes declaration bytes, each with its separator, or -1
 */

/**
 * The selectors of `later` that `group` does not list yet, and the bytes a
 * join saves: the declarations that leave `later`, less the selectors the
 * group takes. A later rule that keeps no declaration is removed with its
 * selector and braces, so that join always shortens the output.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {Group} group
 * @param {RuleRecord} later
 * @return {{addedIds: TokenListId[], gain: number}} the ids of the selectors
 * the join adds
 */
function joinGain(records, tokenLists, group, later) {
  if (group.bytes < 0) {
    group.bytes = group.declarations.reduce(
      (total, declaration) => total + minifiedLength(declaration),
      0
    );
  }
  const listed = (group.selectors ??= new Set(group.rule.selectorIds));
  const laterIds = later.selectorIds;
  const addedIds = [];
  const seen = new Set();
  for (let at = 0; at < laterIds.length; at++) {
    const id = laterIds[at];
    if (seen.has(id)) continue;
    seen.add(id);
    if (listed.has(id)) continue;
    addedIds.push(id);
  }
  const removed =
    group.declarations.length === childCountOf(records, later.index)
      ? group.bytes + listLength(tokenLists, laterIds)
      : group.bytes;
  return { addedIds, gain: removed - listLength(tokenLists, addedIds) };
}

/**
 * A later rule that repeats all declarations of an earlier rule adds its
 * selectors to that rule, and gives up the repeated declarations, when no
 * node between them sets a property they also set: the earlier rule then
 * applies the declarations to the same elements as before. The earlier
 * rule, the group, keeps its position and its declarations, so it can take
 * further rules.
 *
 * @param {BlockRecord} block
 * @param {MergeState} mergeState
 * @return {boolean}
 */
export default function joinByDeclarations(block, mergeState) {
  if (isKeyframes(block)) return false;
  const entries = childEntriesOf(mergeState.records, block.index);
  const declarationRules = entries.map(
    (entry) =>
      entry.kind === RULE && isDeclarationRule(mergeState.records, entry)
  );
  // Rules can only join where they share a declaration. The keys are read
  // here, before any edit, so no loop holds a rule's keys across an edit.
  const scan = new RepeatScan();
  for (const [i, entry] of entries.entries()) {
    if (!declarationRules[i]) continue;
    const record = /** @type {RuleRecord} */ (entry);
    for (const key of declarationKeys(mergeState.records, record.index).keySet)
      scan.see(key, i);
  }
  if (scan.start === Infinity) return false;

  const index = new LastWriteIndex();
  // Groups by their first declaration, in document order: a rule that
  // repeats a group's declarations repeats that one too.
  /** @type {Map<number, Group[]>} */
  const groups = new Map();
  // Rules whose selector lists grew; their text is written once at the end,
  // since rewriting a long list on every join would cost quadratic time.
  /** @type {Set<ArenaIndex>} the indices of the rules that grew */
  const grown = new Set();
  // Rules that gave up every declaration, detached together at the end:
  // removing each one splices the parent's array, which takes quadratic time.
  /** @type {Set<ArenaIndex>} the indices of the rules that gave up every declaration */
  const emptied = new Set();
  for (
    let position = /** @type {ChainPosition} */ (scan.start);
    position < entries.length;
    position++
  ) {
    const entry = entries[position];
    if (declarationRules[position]) {
      const record = /** @type {RuleRecord} */ (entry);
      const outcome = joinIntoGroup(record);
      if (outcome === 'emptied') continue;
      register(record, position);
    }
    index.recordNode(mergeState.records, entry, position);
  }
  removeRules(mergeState, emptied);
  return grown.size > 0;

  /**
   * @param {RuleRecord} rule
   * @param {ChainPosition} position
   */
  function register(rule, position) {
    // A trimmed rule's record took its remaining declarations, so its keys are new.
    const { kept } = declarationKeys(mergeState.records, rule.index);
    // A declaration-only rule holds a declaration, so its first id exists.
    const firstId = /** @type {DeclarationRecord} */ (
      mergeState.records.entry(kept[0])
    ).id;
    /** @type {Group} */
    const group = {
      rule,
      position,
      declarations: declarationsOf(mergeState.records, rule.index),
      selectors: null,
      bytes: -1,
    };
    const same = groups.get(firstId);
    if (same) same.push(group);
    else groups.set(firstId, [group]);
  }

  /**
   * @param {RuleRecord} laterRecord
   * @return {'emptied' | 'trimmed' | null} whether the rule gave up all its
   * declarations, some of them, or joined no group
   */
  function joinIntoGroup(laterRecord) {
    const { records } = mergeState;
    const laterDeclarations = declarationsOf(records, laterRecord.index);
    const laterSet = declarationKeys(
      mergeState.records,
      laterRecord.index
    ).keySet;
    // Every declaration of `later`, claimed or not, is written by `later`.
    const laterKeys = elementKeysOf(mergeState.records, laterRecord.index);
    /** @type {{group: Group, claimed: Set<ArenaIndex>, addedIds: TokenListId[], gain: number} | null} */
    let best = null;
    for (const id of laterSet) {
      const candidates = groups.get(id) ?? [];
      for (let i = candidates.length - 1; i >= 0; i--) {
        const group = candidates[i];
        // A write since a group to the property of its first declaration
        // rules out that group and every earlier one, which only cross more.
        if (
          index.conflictsSince(
            group.declarations.slice(0, 1),
            group.position,
            laterKeys
          )
        )
          break;
        if (
          group.declarations.length > laterDeclarations.length ||
          !declarationKeys(records, group.rule.index).kept.every((kept) =>
            laterSet.has(
              /** @type {DeclarationRecord} */ (records.entry(kept)).id
            )
          )
        ) {
          continue;
        }
        const { addedIds, gain } = joinGain(
          records,
          mergeState.tokenLists,
          group,
          laterRecord
        );
        // A join that breaks even still takes the shared declarations out of
        // the way of later rules that can join the group. On a tie, the
        // nearest group has the least to cross.
        if (
          gain < 0 ||
          (best &&
            (gain < best.gain ||
              (gain === best.gain && group.position < best.group.position)))
        ) {
          continue;
        }
        const claimedIndices = claimRepeats(
          group.declarations,
          laterDeclarations
        );
        if (!claimedIndices) continue;
        const claimed = [...claimedIndices].map(
          (declarationIndex) =>
            /** @type {DeclarationRecord} */ (records.entry(declarationIndex))
        );
        if (index.conflictsSince(claimed, group.position, laterKeys)) continue;
        if (!mergeState.canMerge(group.rule, laterRecord)) continue;
        best = { group, claimed: claimedIndices, addedIds, gain };
      }
    }
    if (!best) return null;
    const { group, claimed, addedIds } = best;
    const groupRecord = group.rule;
    const listed =
      elementKeysOf(mergeState.records, groupRecord.index) !== null;
    const gained = mergeState.addSelectors(groupRecord, addedIds);
    for (const id of addedIds) group.selectors?.add(id);
    if (listed) recordGained(group, gained);
    grown.add(group.rule.index);
    const outcome = withdraw(laterRecord, claimed);
    return outcome;
  }

  /**
   * The group's declarations already stand at its position for the elements it
   * listed, so only the elements its new selectors bring are recorded. Writes
   * to unknown elements are recorded already, so only a listed group calls it.
   *
   * @param {Group} group
   * @param {readonly string[] | null} gained null when the group's elements
   * became unknown
   */
  function recordGained(group, gained) {
    if (gained?.length === 0) return;
    for (const declaration of group.declarations)
      index.record(declaration.keys, group.position, gained);
  }

  /**
   * @param {RuleRecord} later
   * @param {Set<ArenaIndex>} claimed the declarations that leave
   * @return {'emptied' | 'trimmed'}
   */
  function withdraw(later, claimed) {
    // The group's writes already stand at its position, so the declarations
    // that leave `later` record nothing.
    const { records } = mergeState;
    if (claimed.size === declarationKeys(records, later.index).kept.length) {
      emptied.add(later.index);
      return 'emptied';
    }
    removeDeclarations(records, later.index, claimed);
    return 'trimmed';
  }
}
