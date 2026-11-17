/** @import {TokenListId, TokenLists} from './tokenLists.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {RuleElementKeys} from './elementKeys.js' */
import { VendorPrefixSummary } from './vendorPrefixSummary.js';
import { extendSummaries, reachedRules } from './selectorList.js';
/** @import {RuleRecord} from './ruleRecord.js' */

/**
 * The reads of a rule's selector list. Each reads the summaries that
 * `selectorList.js` folds, or the ids, and writes nothing.
 */

/**
 * Whether the stored summaries of every rule the root reaches equal the fold
 * of its ids. Writes nothing; the tree check calls it under consistency checks.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {boolean}
 */
export function summariesHold(records, tokenLists, browsers) {
  for (const rule of reachedRules(records)) {
    if (!foldHolds(rule, tokenLists, browsers)) return false;
  }
  return true;
}

/**
 * Whether a rule's stored summaries equal the fold of its ids, folded into a
 * scratch summary that the rule does not hold.
 *
 * @param {RuleRecord} list
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {boolean}
 */
function foldHolds(list, tokenLists, browsers) {
  const fold = /** @type {RuleRecord} */ (
    /** @type {unknown} */ ({
      selectorIds: list.selectorIds,
      compatible: true,
      vendor: new VendorPrefixSummary(null, false),
      elementKeys: { list: [], seen: new Set() },
    })
  );
  extendSummaries(fold, 0, tokenLists, browsers);
  return (
    fold.compatible === list.compatible &&
    fold.vendor.sameAs(list.vendor) &&
    sameElementKeys(fold.elementKeys, list.elementKeys)
  );
}

/**
 * @param {RuleElementKeys | null} first
 * @param {RuleElementKeys | null} second
 * @return {boolean}
 */
function sameElementKeys(first, second) {
  if (first === null || second === null) return first === second;
  if (first.list.length !== second.list.length) return false;
  for (let at = 0; at < first.list.length; at++) {
    if (first.list[at] !== second.list[at]) return false;
  }
  return true;
}

/**
 * Whether every selector of a rule suits the target browsers.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {boolean}
 */
export function compatibleOf(records, index) {
  return /** @type {RuleRecord} */ (records.rule(index)).compatible;
}

/**
 * @param {BlockRecords} records
 * @param {number} index
 * @return {VendorPrefixSummary}
 */
export function vendorSummaryOf(records, index) {
  return /** @type {RuleRecord} */ (records.rule(index)).vendor;
}

/**
 * The elements a rule can match, as `elementKeyOf` in `elementKeys.js`
 * describes them, or null when any selector has no key or there are none,
 * which must not read as a rule that writes to no element.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {string[] | null}
 */
export function elementKeysOf(records, index) {
  const keys = /** @type {RuleRecord} */ (records.rule(index)).elementKeys;
  return keys?.list.length ? keys.list : null;
}

/**
 * Whether two rules have the same selectors in the same order. A selector holds
 * no top-level comma, so two lists are equal exactly when their ids are.
 *
 * @param {BlockRecords} records
 * @param {number} firstIndex
 * @param {number} secondIndex
 * @return {boolean}
 */
export function hasSameSelectors(records, firstIndex, secondIndex) {
  const ids = /** @type {RuleRecord} */ (records.rule(firstIndex)).selectorIds;
  const otherIds = /** @type {RuleRecord} */ (records.rule(secondIndex))
    .selectorIds;
  if (ids.length !== otherIds.length) return false;
  for (let at = 0; at < ids.length; at++) {
    if (ids[at] !== otherIds[at]) return false;
  }
  return true;
}

/**
 * The key of a list of selectors: its ids joined by commas.
 *
 * @param {readonly TokenListId[]} ids
 * @return {string}
 */
export function listKey(ids) {
  let key = '';
  for (let at = 0; at < ids.length; at++) {
    if (at > 0) key += ',';
    key += ids[at];
  }
  return key;
}

/**
 * The length of the text of one selector, which is its token list's text.
 *
 * @param {TokenLists} tokenLists
 * @param {TokenListId} id
 * @return {number}
 */
export function selectorTextLength(tokenLists, id) {
  return tokenLists.textLength(id);
}

/**
 * The length of the selectors' texts joined by bare commas: the sum of the
 * texts, with one comma less than the count.
 *
 * @param {TokenLists} tokenLists
 * @param {readonly TokenListId[]} ids
 * @return {number}
 */
export function listTextLength(tokenLists, ids) {
  let total = ids.length - 1;
  for (let at = 0; at < ids.length; at++) {
    total += selectorTextLength(tokenLists, ids[at]);
  }
  return total;
}
