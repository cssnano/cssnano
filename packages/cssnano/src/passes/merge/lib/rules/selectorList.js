import { addElementKeys, elementKeyOf } from './elementKeys.js';
import { selectorsCompatible } from './ensureCompatibility.js';
import { VendorPrefixSummary } from './vendorPrefixSummary.js';
import { selectorRanges } from '../../../../values/selectorRanges.js';
import { tokens as tokenize } from '../../../../utils/value.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Rule} from 'postcss' */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {SelectorRange} from '../../../../values/selectorRanges.js' */
/** @import {RuleElementKeys} from './elementKeys.js' */
/** @typedef {(selector: string, list?: SelectorList, index?: number) => import('./ensureCompatibility.js').SelectorInfo} SelectorLookup */
/** @typedef {(selector: string, piece: RangePiece | null) => string | null} ElementKeyOf */
/**
 * The token ranges of a list's selectors, for the tokens of the text the list
 * spells. `spans` is usable only while it matches the selectors one for one.
 *
 * @typedef {{source: string, tokens: readonly CSSToken[], spans: SelectorRange[]}} SelectorRanges
 */

/** @type {readonly string[]} */
const noElementKeys = Object.freeze([]);

/**
 * The selector list of a rule with the facts derived from it, each computed on
 * first use and then grown incrementally as the list grows. It is the base of
 * `RuleRecord`, not a member of it, so a rule is one object with one layout.
 *
 * It also holds the text the rule spells: the selector in PostCSS's form, the
 * source text when its comments make it differ, and the tokens of that text.
 */
export class SelectorList {
  /** @type {Rule} the rule the list belongs to, read for the browser targets */
  #node;
  /** @type {string[]} */
  #selectors;
  /** @type {string} the selector the rule spells, in PostCSS's form */
  #selector;
  /** @type {string | undefined} the source text, when it differs from the selector */
  #sourceSelector;
  /** @type {readonly CSSToken[] | undefined} the tokens of the source text, once known */
  #tokens;
  /** @type {boolean} whether the table holds `#tokens` for the text the node spells */
  #listStored;
  /** @type {boolean} whether the selector was written by a merge, and must be written back */
  #marked = false;
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
   * @param {string} selector the selector as PostCSS gives it, which drops a comment only where no tokens join
   * @param {string | undefined} sourceSelector the source text, set only when it differs from the selector
   * @param {readonly CSSToken[] | undefined} tokens the stored tokens of the source text
   */
  constructor(node, selectors, selector, sourceSelector, tokens) {
    this.#node = node;
    this.#selectors = selectors;
    this.#selector = selector;
    this.#sourceSelector = sourceSelector;
    this.#tokens = tokens;
    this.#listStored = tokens !== undefined;
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

  /** @return {string} the selector, in PostCSS's form */
  get selector() {
    return this.#selector;
  }

  /** @return {string} the text the list spells, with its comments */
  get sourceText() {
    return this.#sourceSelector ?? this.#selector;
  }

  /** @return {readonly CSSToken[] | undefined} the tokens of the source text, undefined until known */
  get tokens() {
    return this.#tokens;
  }

  /** @return {boolean} whether the table holds the tokens, so they need no write-back */
  get listStored() {
    return this.#listStored;
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
   * Sets the selector the rule spells. Its source text and tokens belonged to
   * the old text, so they are dropped.
   *
   * @param {string} selector
   */
  setSelector(selector) {
    this.#selector = selector;
    this.#sourceSelector = undefined;
    this.#tokens = undefined;
    this.#listStored = false;
    this.#ranges = undefined;
  }

  /**
   * Gives the list tokens that the table does not hold yet, which write-back stores.
   *
   * @param {readonly CSSToken[]} tokens the tokens of the source text
   */
  setTokens(tokens) {
    this.#tokens = tokens;
    this.#listStored = false;
    this.#ranges = undefined;
    if (this.#pieces === null) this.#pieces = undefined;
  }

  /** Records that write-back stored the tokens in the table. */
  markStored() {
    this.#listStored = true;
  }

  /**
   * The tokens of the source text, which the first reader tokenizes and keeps.
   *
   * @return {readonly CSSToken[]}
   */
  tokensOf() {
    if (this.#tokens === undefined) this.setTokens(tokenize(this.sourceText));
    return /** @type {readonly CSSToken[]} */ (this.#tokens);
  }

  /**
   * The token ranges of the selectors, found in the tokens of the source text.
   * They are derived at the first read, and derived again only when the tokens
   * change.
   *
   * @return {SelectorRanges}
   */
  rangesOf() {
    const tokens = this.tokensOf();
    if (this.#ranges?.tokens !== tokens) {
      this.#ranges = {
        source: this.sourceText,
        tokens,
        spans: selectorRanges(tokens),
      };
    }
    return this.#ranges;
  }

  /** @param {RangePiece[] | null} pieces one per selector, or null */
  setPieces(pieces) {
    this.#pieces = pieces;
  }

  /** @return {RangePiece[] | null | undefined} null when the token ranges are not known, undefined until set */
  get pieces() {
    return this.#pieces;
  }

  /**
   * @param {SelectorLookup} lookup
   * @return {VendorPrefixSummary}
   */
  vendorProfile(lookup) {
    if (this.#vendor === undefined) {
      // A loop, since `map` would pass each index to a lookup that takes a list.
      const infos = [];
      for (const [index, selector] of this.#selectors.entries()) {
        infos.push(lookup(selector, this, index));
      }
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
    this.#vendor = vendor;
    this.#ranges = undefined;
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
