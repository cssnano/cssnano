/** @import {TokenListId, TokenLists} from '../../../ir/tokenLists.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
import { elementKeyOf } from './elementKeys.js';
import { selectorInfoOf } from './ensureCompatibility.js';
import { VendorPrefixSummary } from './vendorPrefixSummary.js';
import { AT_RULE_BLOCK, RULE, STYLESHEET } from './blockRecord.js';

/** @import {RuleElementKeys} from './elementKeys.js' */

/**
 * The ids of a rule whose list has moved to another rule. It is frozen, so a
 * push onto it throws and an edit of the moved rule fails at once.
 *
 * @type {TokenListId[]}
 */
const NO_SELECTORS = /** @type {TokenListId[]} */ (
  /** @type {unknown} */ (Object.freeze([]))
);

/** @type {readonly string[]} */
const noElementKeys = Object.freeze([]);

/**
 * The vendor summary of a rule whose facts are not folded yet. It is shared,
 * so nothing may add to it: `fillSummaries` gives each rule its own.
 */
export const UNFOLDED_VENDOR = new VendorPrefixSummary(null, false);

/**
 * The fields this module writes, which are readonly everywhere else.
 *
 * @typedef {object} WritableSummaries
 * @property {TokenListId[]} selectorIds
 * @property {boolean} compatible
 * @property {VendorPrefixSummary} vendor
 * @property {RuleElementKeys | null} elementKeys
 * @property {boolean} marked
 */

/**
 * The one writable view of a rule's list and summaries. Only the functions
 * of this module write them.
 *
 * @param {RuleRecord} list
 * @return {WritableSummaries}
 */
function writableIds(list) {
  return /** @type {WritableSummaries} */ (/** @type {unknown} */ (list));
}

/**
 * Folds the summaries of every rule the root reaches. Every read of a summary
 * then finds it filled, so no read writes a field.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {void}
 */
export function fillSummaries(records, tokenLists, browsers) {
  for (const rule of reachedRules(records)) {
    fillRule(rule, tokenLists, browsers);
  }
}

/**
 * The rules under `parent` that the root reaches, at any depth, in document order.
 *
 * @param {BlockRecords} records
 * @param {number} parent the index of a container
 * @return {Generator<RuleRecord>}
 */
function* rulesUnder(records, parent) {
  for (
    let index = records.links.firstChild(parent);
    index !== -1;
    index = records.links.nextSibling(index)
  ) {
    const entry = records.entry(index);
    if (entry.kind === RULE) {
      yield /** @type {RuleRecord} */ (entry);
      yield* rulesUnder(records, index);
    } else if (entry.kind === STYLESHEET || entry.kind === AT_RULE_BLOCK) {
      yield* rulesUnder(records, index);
    }
  }
}

/**
 * The rules the root reaches, at any depth, in document order.
 *
 * @param {BlockRecords} records
 * @return {Generator<RuleRecord>}
 */
export function reachedRules(records) {
  return rulesUnder(records, records.root.index);
}

/**
 * Gives a rule the summaries of its whole list, folded from its ids.
 *
 * @param {RuleRecord} list
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {void}
 */
function fillRule(list, tokenLists, browsers) {
  const own = writableIds(list);
  own.compatible = true;
  own.vendor = new VendorPrefixSummary(null, false);
  own.elementKeys = { list: [], seen: new Set() };
  extendSummaries(list, 0, tokenLists, browsers);
}

/**
 * Folds the facts of the selectors from index `from` on into a rule's
 * summaries, which must already cover the selectors before them.
 *
 * @param {RuleRecord} list
 * @param {number} from
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {void}
 */
export function extendSummaries(list, from, tokenLists, browsers) {
  const own = writableIds(list);
  const ids = list.selectorIds;
  for (let at = from; at < ids.length; at++) {
    const tokens = tokenLists.get(ids[at]);
    const info = selectorInfoOf(tokens, browsers);
    if (!info.compatible) own.compatible = false;
    own.vendor.add(info);
    const keys = own.elementKeys;
    if (keys !== null) {
      const key = elementKeyOf(tokens);
      if (key === null) {
        own.elementKeys = null;
      } else if (!keys.seen.has(key)) {
        keys.seen.add(key);
        keys.list.push(key);
      }
    }
  }
}

/**
 * Appends selectors to a placed rule, with their ids and facts.
 *
 * @param {BlockRecords} records
 * @param {number} index the rule's index
 * @param {readonly TokenListId[]} ids the id of each selector appended
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {readonly string[] | null} the element keys the selectors add to
 * those listed, or null when the elements are not listed
 */
export function addSelectors(records, index, ids, tokenLists, browsers) {
  const list = /** @type {RuleRecord} */ (records.rule(index));
  const from = list.selectorIds.length;
  const listed = list.elementKeys?.list.length;
  const own = writableIds(list);
  for (const id of ids) own.selectorIds.push(id);
  own.marked = true;
  extendSummaries(list, from, tokenLists, browsers);
  return gainedKeys(list, listed);
}

/**
 * The element keys a rule gained since it listed `listed` of them.
 *
 * @param {RuleRecord} list
 * @param {number | undefined} listed the length of its list before the change, or undefined when unlisted
 * @return {readonly string[] | null}
 */
function gainedKeys(list, listed) {
  const keys = list.elementKeys;
  if (listed === undefined || keys === null) return null;
  return keys.list.length === listed ? noElementKeys : keys.list.slice(listed);
}

/**
 * Gives `later` the selectors of `earlier`, which stands before it and is
 * dropped by the caller. Its summaries combine without a fact read: the
 * element keys of the earlier selectors come first.
 *
 * @param {BlockRecords} records
 * @param {number} laterIndex
 * @param {number} earlierIndex
 * @return {void}
 */
export function absorbEarlier(records, laterIndex, earlierIndex) {
  const later = /** @type {RuleRecord} */ (records.rule(laterIndex));
  const earlier = /** @type {RuleRecord} */ (records.rule(earlierIndex));
  const compatible = earlier.compatible && later.compatible;
  const vendor = earlier.vendor.concat(later.vendor);
  const keys = joinKeys(earlier.elementKeys, later.elementKeys);
  // The earlier list's id array moves here, so the earlier rule keeps no array.
  const ids = /** @type {TokenListId[]} */ (writableIds(earlier).selectorIds);
  for (const id of later.selectorIds) ids.push(id);
  const own = writableIds(later);
  own.selectorIds = ids;
  own.compatible = compatible;
  own.vendor = vendor;
  own.elementKeys = keys;
  own.marked = true;
  writableIds(earlier).selectorIds = NO_SELECTORS;
}

/**
 * The summaries of a rule made from two rules' selectors, in order: the first
 * rule's ids, then the second's. `target` holds no id of the two yet, and it
 * must be given its ids, then `extendSummaries` for any ids after them.
 *
 * @param {RuleRecord} target a new rule, unplaced, whose ids are the two rules' ids
 * @param {RuleRecord} first
 * @param {RuleRecord} second
 * @return {void}
 */
export function combineSummaries(target, first, second) {
  const own = writableIds(target);
  own.compatible = first.compatible && second.compatible;
  own.marked = true;
  own.vendor = first.vendor.concat(second.vendor);
  // A copy, since both inputs stay alive as they are.
  const keys = first.elementKeys;
  own.elementKeys = joinKeys(
    keys === null ? null : { list: [...keys.list], seen: new Set(keys.list) },
    second.elementKeys
  );
}

/**
 * The keys of `earlier` followed by those of `later`, in first-seen order,
 * added to `earlier`'s set, which the caller owns. Null when either list
 * holds a null.
 *
 * @param {RuleElementKeys | null} earlier
 * @param {RuleElementKeys | null} later
 * @return {RuleElementKeys | null}
 */
function joinKeys(earlier, later) {
  if (earlier === null || later === null) return null;
  for (const key of later.list) {
    if (!earlier.seen.has(key)) {
      earlier.seen.add(key);
      earlier.list.push(key);
    }
  }
  return earlier;
}
