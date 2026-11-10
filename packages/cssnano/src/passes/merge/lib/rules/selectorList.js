/** @import {TokenListId, TokenLists} from '../../../ir/tokenLists.js' */
/** @import {BlockRecords} from './blockRecords.js' */
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
export const NO_SELECTORS = /** @type {TokenListId[]} */ (
  /** @type {unknown} */ (Object.freeze([]))
);

/** @type {readonly string[]} */
const noElementKeys = Object.freeze([]);

/**
 * The vendor summary of a rule whose facts are not folded yet. It is shared,
 * so nothing may add to it: `fillSummaries` gives each rule its own.
 */
const UNFOLDED_VENDOR = new VendorPrefixSummary(null, false);

/**
 * The fields this module writes, which are readonly everywhere else.
 *
 * @typedef {object} WritableSummaries
 * @property {TokenListId[]} selectorIds
 * @property {boolean} compatible
 * @property {VendorPrefixSummary} vendor
 * @property {RuleElementKeys | null} elementKeys
 */

/**
 * The one writable view of a rule's list and summaries. Only the functions
 * of this module write them.
 *
 * @param {SelectorList} list
 * @return {WritableSummaries}
 */
function writableIds(list) {
  return /** @type {WritableSummaries} */ (/** @type {unknown} */ (list));
}

/**
 * The selector list of a rule, with the facts folded from its ids. It is the
 * base of `RuleRecord`, not a member of it, so a rule is one object with one
 * layout. The summaries are kept in step by the functions of this module.
 */
export class SelectorList {
  /** @type {string[]} */
  #selectors;
  /** @type {string} the selector the rule spells, in PostCSS's form */
  #selector;
  /** @type {boolean} whether the selector was written by a merge, and must be written back */
  #marked = false;
  /** @type {string | undefined} the selectors joined by commas, once known */
  #selectorText;

  /**
   * The interned id of each selector, in order. A selector's id is the same
   * for every rule that holds an equal item. It is read-only: only the
   * functions of this module move or append ids.
   *
   * @readonly
   * @type {readonly TokenListId[]}
   */
  selectorIds;

  /**
   * Whether every selector suits the target browsers.
   *
   * @readonly
   * @type {boolean}
   */
  compatible = false;

  /**
   * The vendor prefix summary of the selectors.
   *
   * @readonly
   * @type {VendorPrefixSummary}
   */
  vendor = UNFOLDED_VENDOR;

  /**
   * The element keys of the selectors, or null when a selector has none. The
   * list is empty when the rule has no selectors.
   *
   * @readonly
   * @type {RuleElementKeys | null}
   */
  elementKeys = null;

  /**
   * @param {string[]} selectors
   * @param {string} selector the selector as PostCSS gives it, which drops a comment only where no tokens join
   * @param {readonly TokenListId[]} selectorIds the interned id of each of `selectors`
   */
  constructor(selectors, selector, selectorIds) {
    this.#selectors = selectors;
    this.#selector = selector;
    this.selectorIds = selectorIds;
  }

  /** @return {string[]} change it only through the methods of this class */
  get selectors() {
    return this.#selectors;
  }

  /** @return {string} the selector, in PostCSS's form */
  get selector() {
    return this.#selector;
  }

  /** @return {boolean} whether a merge wrote the selector, so write-back assigns it */
  get marked() {
    return this.#marked;
  }

  /** Marks the selector as written by a merge. */
  mark() {
    this.#marked = true;
  }

  /**
   * Sets the selector the rule spells.
   *
   * @param {string} selector
   */
  setSelector(selector) {
    this.#selector = selector;
  }

  /** @return {string} */
  selectorText() {
    this.#selectorText ??= this.#selectors.join(',');
    return this.#selectorText;
  }

  /**
   * Appends selectors to the text list, which the ids of the same rule follow.
   *
   * @param {string[]} selectors
   */
  appendSelectors(selectors) {
    this.#selectorText = undefined;
    for (const selector of selectors) this.#selectors.push(selector);
  }

  /**
   * Takes the selectors of `earlier` ahead of this list's, as the earlier list
   * grows in place. The joined text is concatenated, since joining a long list
   * again on every merge would take quadratic time. `earlier` keeps no array.
   *
   * @param {SelectorList} earlier
   */
  takeEarlier(earlier) {
    const text = `${earlier.selectorText()},${this.selectorText()}`;
    const selectors = earlier.#selectors;
    for (const selector of this.#selectors) selectors.push(selector);
    this.#selectors = selectors;
    this.#selectorText = text;
  }
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
 * @return {Generator<SelectorList>}
 */
function* rulesUnder(records, parent) {
  for (
    let index = records.links.firstChild(parent);
    index !== -1;
    index = records.links.nextSibling(index)
  ) {
    const entry = records.entry(index);
    if (entry.kind === RULE) {
      yield /** @type {SelectorList} */ (entry);
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
 * @return {Generator<SelectorList>}
 */
export function reachedRules(records) {
  return rulesUnder(records, records.root.index);
}

/**
 * Gives a rule the summaries of its whole list, folded from its ids.
 *
 * @param {SelectorList} list
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
 * @param {SelectorList} list
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
 * @param {string[]} selectors appended to the rule's selectors
 * @param {readonly TokenListId[]} ids the id of each of `selectors`
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {readonly string[] | null} the element keys the selectors add to
 * those listed, or null when the elements are not listed
 */
export function addSelectors(
  records,
  index,
  selectors,
  ids,
  tokenLists,
  browsers
) {
  const list = /** @type {SelectorList} */ (records.rule(index));
  const from = list.selectorIds.length;
  const listed = list.elementKeys?.list.length;
  list.appendSelectors(selectors);
  const own = writableIds(list).selectorIds;
  for (const id of ids) own.push(id);
  extendSummaries(list, from, tokenLists, browsers);
  return gainedKeys(list, listed);
}

/**
 * The element keys a rule gained since it listed `listed` of them.
 *
 * @param {SelectorList} list
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
  const later = /** @type {SelectorList} */ (records.rule(laterIndex));
  const earlier = /** @type {SelectorList} */ (records.rule(earlierIndex));
  const compatible = earlier.compatible && later.compatible;
  const vendor = earlier.vendor.concat(later.vendor);
  const keys = joinKeys(earlier.elementKeys, later.elementKeys);
  later.takeEarlier(earlier);
  // The earlier list's id array moves here, so the earlier rule keeps no array.
  const ids = /** @type {TokenListId[]} */ (writableIds(earlier).selectorIds);
  for (const id of later.selectorIds) ids.push(id);
  const own = writableIds(later);
  own.selectorIds = ids;
  own.compatible = compatible;
  own.vendor = vendor;
  own.elementKeys = keys;
  writableIds(earlier).selectorIds = NO_SELECTORS;
}

/**
 * The summaries of a rule made from two rules' selectors, in order: the first
 * rule's ids, then the second's. `target` holds no id of the two yet, and it
 * must be given its ids, then `extendSummaries` for any ids after them.
 *
 * @param {SelectorList} target a new rule, unplaced, whose ids are the two rules' ids
 * @param {SelectorList} first
 * @param {SelectorList} second
 * @return {void}
 */
export function combineSummaries(target, first, second) {
  const own = writableIds(target);
  own.compatible = first.compatible && second.compatible;
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
