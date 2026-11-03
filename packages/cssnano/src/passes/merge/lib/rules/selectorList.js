import { addElementKeys, elementKeyOf } from './elementKeys.js';
import { selectorsCompatible } from './ensureCompatibility.js';
import { VendorPrefixSummary } from './vendorPrefixSummary.js';
import { selectorRanges } from '../../../../values/selectorRanges.js';
import { sourceSelector } from '../../../../utils/sourceText.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Rule} from 'postcss' */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {SelectorRange} from '../../../../values/selectorRanges.js' */
/** @import {RuleElementKeys} from './elementKeys.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */
/** @typedef {(selector: string, list?: SelectorList, index?: number) => import('./ensureCompatibility.js').SelectorInfo} SelectorLookup */
/** @typedef {(selector: string, piece: RangePiece | null) => string | null} ElementKeyOf */
/**
 * The token ranges of a list's selectors, for the tokens of the list's text.
 * `spans` is usable only while it matches the selectors one for one.
 *
 * @typedef {{source: string, tokens: readonly CSSToken[], spans: SelectorRange[]}} SelectorRanges
 */

/** @type {readonly string[]} */
const noElementKeys = Object.freeze([]);

/**
 * The selector list of a rule with the facts derived from it, each computed on
 * first use and then grown incrementally as the list grows. It is the base of
 * `RuleRecord`, not a member of it, so a rule is one object with one layout.
 */
export class SelectorList {
  /** @type {Rule} the rule the list belongs to, read for the browser targets */
  #node;
  /** @type {string[]} */
  #selectors;
  /** @type {VendorPrefixSummary | undefined} */
  #vendor;
  /** @type {string | undefined} the selectors joined by commas, once known */
  #selectorText;
  /** @type {RuleElementKeys | null | undefined} null when a selector has no element key */
  #elementKeys;
  /** @type {RangePiece[] | null | undefined} the token range of each selector; null when unknown */
  #pieces;
  /** @type {boolean | undefined} whether every selector suits the target browsers, once read */
  #compatible;
  /** @type {SelectorRanges | undefined} derived at the first read, dropped when the selectors change */
  #ranges;

  /**
   * @param {Rule} node
   * @param {string[]} selectors
   */
  constructor(node, selectors) {
    this.#node = node;
    this.#selectors = selectors;
    this.#vendor = undefined;
    this.#selectorText = undefined;
    this.#elementKeys = undefined;
    this.#pieces = undefined;
    this.#compatible = undefined;
    this.#ranges = undefined;
  }

  /** @return {Rule} the rule the list belongs to, which is never changed */
  get node() {
    return this.#node;
  }

  /** @return {string[]} change it only through the methods of this class */
  get selectors() {
    return this.#selectors;
  }

  /** @return {RangePiece[] | null | undefined} null when the token ranges are not known, undefined until set */
  get pieces() {
    return this.#pieces;
  }

  /** @param {RangePiece[] | null} pieces one per selector, or null */
  setPieces(pieces) {
    this.#pieces = pieces;
  }

  /**
   * The token ranges of the selectors, found in the tokens the table gives the
   * rule's text. They are derived at the first read, and derived again only when
   * those tokens change.
   *
   * @param {TextTable} table
   * @return {SelectorRanges}
   */
  rangesOf(table) {
    const tokens = table.tokens(this.#node);
    if (this.#ranges?.tokens !== tokens) {
      this.#ranges = {
        source: sourceSelector(this.#node),
        tokens,
        spans: selectorRanges(tokens),
      };
    }
    return this.#ranges;
  }

  /**
   * @param {SelectorLookup} lookup
   * @return {VendorPrefixSummary}
   */
  vendorProfile(lookup) {
    if (this.#vendor === undefined) {
      // A loop, since `map` would pass each index to a lookup that takes a rule.
      const infos = [];
      for (const selector of this.#selectors) infos.push(lookup(selector));
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
    this.#compatible ??= selectorsCompatible(this.#selectors, lookup, this);
    return this.#compatible;
  }

  /**
   * The elements the selector list can match, as `elementKeyOf` in
   * `elementKeys.js` describes them, or null when any selector has no key or
   * there are none, which must not read as a rule that writes to no element.
   * A caller must not hold the list across a change to the list.
   *
   * @param {ElementKeyOf} [keyOf] the key of one selector
   * @return {string[] | null}
   */
  elementKeys(keyOf = elementKeyOf) {
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
   * Lists of different lengths differ in text too, since a selector holds no
   * top-level comma, so the text of long lists is joined only when needed.
   *
   * @param {SelectorList} other
   * @return {boolean}
   */
  hasSameSelectors(other) {
    return (
      this.#selectors.length === other.#selectors.length &&
      this.selectorText() === other.selectorText()
    );
  }

  /**
   * @param {string[]} selectors appended to the list
   * @param {SelectorLookup} lookup
   * @param {ElementKeyOf} [keyOf]
   * @param {RangePiece[] | null} [pieces] the token range of each selector of
   * the list after the call, or null when they are not known
   * @return {readonly string[] | null} the element keys the selectors add to
   * those listed, or null when the elements are not listed
   */
  addSelectors(selectors, lookup, keyOf = elementKeyOf, pieces = null) {
    this.#selectorText = undefined;
    this.#ranges = undefined;
    const from = this.#selectors.length;
    for (const selector of selectors) {
      this.#selectors.push(selector);
      this.#vendor?.add(lookup(selector));
    }
    this.#pieces = pieces;
    if (this.#compatible) {
      this.#compatible = selectorsCompatible(selectors, lookup, this);
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
   * @param {ElementKeyOf} [keyOf]
   */
  absorbEarlier(earlier, lookup, keyOf = elementKeyOf) {
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
    this.#selectorText = text;
    this.#ranges = undefined;
    this.#vendor = vendor;
    // Grows the earlier list's pieces in place, as its selectors grow.
    const earlierPieces = earlier.#pieces;
    const ownPieces = this.#pieces;
    if (earlierPieces && ownPieces) {
      for (const piece of ownPieces) earlierPieces.push(piece);
      this.#pieces = earlierPieces;
    } else {
      this.#pieces = null;
    }
    // Extends the earlier list's keys only if they are known: deriving them
    // from a long list would repeat on every merge.
    this.#elementKeys = earlier.#elementKeys;
    this.#addElementKeys(from, keyOf);
    this.#compatible = compatible;
  }

  /**
   * Adds the keys of the selectors from index `from` on, each with its token
   * range when the list holds one.
   *
   * @param {number} from
   * @param {ElementKeyOf} keyOf
   */
  #addElementKeys(from, keyOf) {
    if (
      this.#elementKeys &&
      !addElementKeys(
        this.#elementKeys,
        this.#selectors,
        from,
        this.#pieces,
        keyOf
      )
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
