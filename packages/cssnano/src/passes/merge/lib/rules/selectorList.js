import { addElementKeys } from './elementKeys.js';
import { selectorsCompatible } from './ensureCompatibility.js';
import { VendorPrefixSummary } from './vendorPrefixSummary.js';

/** @import {RuleElementKeys} from './elementKeys.js' */
/**
 * The facts of a selector item, found from the tokens its id's list holds.
 *
 * @typedef {(id: number) => import('./ensureCompatibility.js').SelectorInfo} SelectorLookup
 */
/** @typedef {(id: number) => string | null} ElementKeyOf */

/** @type {readonly string[]} */
const noElementKeys = Object.freeze([]);

/**
 * The ids of a rule whose list has moved to another rule. It is frozen, so a
 * push onto it throws and an edit of the moved rule fails at once.
 *
 * @type {number[]}
 */
export const NO_SELECTORS = /** @type {number[]} */ (
  /** @type {unknown} */ (Object.freeze([]))
);

/**
 * The one writable view of a rule's ids. Only the edits of this module write
 * them, as a move or an append that also changes the list's text.
 *
 * @param {SelectorList} list
 * @return {{selectorIds: number[]}}
 */
function writableIds(list) {
  return /** @type {{selectorIds: number[]}} */ (/** @type {unknown} */ (list));
}

/**
 * The selector list of a rule with the facts derived from it, each computed on
 * first use and then grown incrementally as the list grows. It is the base of
 * `RuleRecord`, not a member of it, so a rule is one object with one layout.
 */
export class SelectorList {
  /** @type {string[]} */
  #selectors;
  /** @type {string} the selector the rule spells, in PostCSS's form */
  #selector;
  /** @type {boolean} whether the selector was written by a merge, and must be written back */
  #marked = false;
  /** @type {VendorPrefixSummary | undefined} */
  #vendor;
  /** @type {string | undefined} the selectors joined by commas, once known */
  #selectorText;
  /** @type {RuleElementKeys | null | undefined} null when a selector has no element key */
  #elementKeys;
  /** @type {boolean | undefined} whether every selector suits the target browsers, once read */
  #compatible;

  /**
   * The interned id of each selector, in order. A selector's id is the same
   * for every rule that holds an equal item. It is read-only: only the edits
   * of this class move or append ids, through `writableIds`.
   *
   * @readonly
   * @type {readonly number[]}
   */
  selectorIds;

  /**
   * @param {string[]} selectors
   * @param {string} selector the selector as PostCSS gives it, which drops a comment only where no tokens join
   * @param {readonly number[]} selectorIds the interned id of each of `selectors`
   */
  constructor(selectors, selector, selectorIds) {
    this.#selectors = selectors;
    this.#selector = selector;
    this.selectorIds = selectorIds;
    this.#vendor = undefined;
    this.#selectorText = undefined;
    this.#elementKeys = undefined;
    this.#compatible = undefined;
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

  /**
   * @param {SelectorLookup} lookup
   * @return {VendorPrefixSummary}
   */
  vendorProfile(lookup) {
    if (this.#vendor === undefined) {
      // A loop, since `map` would pass each index as a second argument.
      const infos = [];
      for (const id of this.selectorIds) infos.push(lookup(id));
      this.#vendor = VendorPrefixSummary.of(infos);
    }
    return this.#vendor;
  }

  /**
   * Whether every selector is compatible with the target browsers. It is read
   * once and then kept: a grown list ANDs in the answer for its new selectors.
   *
   * @param {SelectorLookup} lookup
   * @return {boolean}
   */
  compatible(lookup) {
    this.#compatible ??= selectorsCompatible(this.selectorIds, lookup);
    return this.#compatible;
  }

  /**
   * The elements the selector list can match, as `elementKeyOf` in
   * `elementKeys.js` describes them, or null when any selector has no key or
   * there are none, which must not read as a rule that writes to no element.
   * A caller must not hold the list across a change to the list.
   *
   * @param {ElementKeyOf} keyOf the key of the selector with an id
   * @return {string[] | null}
   */
  elementKeys(keyOf) {
    if (this.#elementKeys === undefined) {
      this.#elementKeys = { list: [], seen: new Set() };
      this.#addElementKeys(0, keyOf);
    }
    return this.#elementKeys?.list.length ? this.#elementKeys.list : null;
  }

  /** @return {string} */
  selectorText() {
    this.#selectorText ??= this.#selectors.join(',');
    return this.#selectorText;
  }

  /**
   * Two lists are the same when they have the same selectors in the same
   * order. A selector holds no top-level comma, so the joined texts of two
   * lists are equal exactly when their selectors are, and the ids compare the
   * selectors without joining them.
   *
   * @param {SelectorList} other
   * @return {boolean}
   */
  hasSameSelectors(other) {
    const ids = this.selectorIds;
    const otherIds = other.selectorIds;
    if (ids.length !== otherIds.length) return false;
    for (let at = 0; at < ids.length; at++) {
      if (ids[at] !== otherIds[at]) return false;
    }
    return true;
  }

  /**
   * @param {string[]} selectors appended to the list
   * @param {readonly number[]} ids the id of each of `selectors`
   * @param {SelectorLookup} lookup
   * @param {ElementKeyOf} keyOf
   * @return {readonly string[] | null} the element keys the selectors add to
   * those listed, or null when the elements are not listed
   */
  addSelectors(selectors, ids, lookup, keyOf) {
    this.#selectorText = undefined;
    const from = this.#selectors.length;
    for (const selector of selectors) this.#selectors.push(selector);
    for (const id of ids) this.#vendor?.add(lookup(id));
    const own = writableIds(this).selectorIds;
    for (const id of ids) own.push(id);
    if (this.#compatible) {
      this.#compatible = selectorsCompatible(ids, lookup);
    }
    return this.#gainElementKeys(from, keyOf);
  }

  /**
   * Takes the place of a list that stood before this one, so its selectors
   * come first. The earlier list grows in place and passes to this one, and
   * the joined text is concatenated from the two texts: copying or re-joining
   * a long list on every merge would take quadratic time.
   *
   * @param {SelectorList} earlier left unusable
   * @param {SelectorLookup} lookup
   * @param {ElementKeyOf} keyOf
   */
  absorbEarlier(earlier, lookup, keyOf) {
    // Both answers are read before the lists join, while each list is its own.
    const compatible = earlier.compatible(lookup) && this.compatible(lookup);
    const text = `${earlier.selectorText()},${this.selectorText()}`;
    const vendor = earlier
      .vendorProfile(lookup)
      .concat(this.vendorProfile(lookup));
    const selectors = earlier.#selectors;
    const from = selectors.length;
    for (const selector of this.#selectors) selectors.push(selector);
    this.#selectors = selectors;
    // The earlier list's id array moves here, so the earlier rule keeps no array.
    const ids = /** @type {number[]} */ (writableIds(earlier).selectorIds);
    for (const id of this.selectorIds) ids.push(id);
    writableIds(this).selectorIds = ids;
    writableIds(earlier).selectorIds = NO_SELECTORS;
    this.#selectorText = text;
    this.#vendor = vendor;
    // Extends the earlier list's keys only if they are known: deriving them
    // from a long list would repeat on every merge.
    this.#elementKeys = earlier.#elementKeys;
    this.#addElementKeys(from, keyOf);
    this.#compatible = compatible;
  }

  /**
   * Adds the keys of the selectors from index `from` on.
   *
   * @param {number} from
   * @param {ElementKeyOf} keyOf
   */
  #addElementKeys(from, keyOf) {
    if (
      this.#elementKeys &&
      !addElementKeys(this.#elementKeys, this.selectorIds, from, keyOf)
    ) {
      this.#elementKeys = null;
    }
  }

  /**
   * @param {number} from
   * @param {ElementKeyOf} keyOf
   * @return {readonly string[] | null}
   */
  #gainElementKeys(from, keyOf) {
    const listed = this.#elementKeys?.list.length;
    this.#addElementKeys(from, keyOf);
    const list = this.#elementKeys?.list;
    if (listed === undefined || list === undefined) return null;
    return list.length === listed ? noElementKeys : list.slice(listed);
  }
}
