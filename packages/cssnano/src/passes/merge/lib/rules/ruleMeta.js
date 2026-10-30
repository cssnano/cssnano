import { elementKeyOf } from './elementKeys.js';
import { VendorPrefixSummary } from './vendorPrefixSummary.js';

/** @import {Declaration, Rule} from 'postcss' */
/**
 * @typedef {object} RuleDeclarationKeys
 * @property {number[]} keys
 * @property {Set<number>} keySet
 */
/**
 * @typedef {object} RuleElementKeys
 * @property {string[]} list the distinct keys, in order of first appearance
 * @property {Set<string>} seen the same keys, for membership tests
 */
/** @typedef {(selector: string, rule?: import('postcss').Rule, index?: number) => import('./ensureCompatibility.js').SelectorInfo} SelectorLookup */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {BlockRecord, Slot} from './blockRecords.js' */

/** @type {readonly string[]} */
const noElementKeys = Object.freeze([]);

/**
 * @param {import('postcss').ChildNode} node
 * @return {node is Declaration}
 */
function isDeclaration(node) {
  return node.type === 'decl';
}

/**
 * The selector list of a rule with what is derived from it. Every field is
 * set up front so all instances share one object layout.
 */
export class RuleMeta {
  /** @type {string[]} */
  #selectors;
  /** @type {Declaration[]} */
  #declarations;
  /** @type {VendorPrefixSummary | undefined} derived from the selector list */
  #vendor;
  /** @type {string | undefined} the selector list joined by commas, once known */
  #selectorText;
  /** @type {RuleDeclarationKeys | undefined} derived from the declarations */
  #declarationKeys;
  /** @type {RuleElementKeys | null | undefined} derived from the selector list; null when a selector has no element key */
  #elementKeys;
  /** @type {RangePiece[] | null | undefined} the token range of each selector, one per selector; null when unknown */
  #pieces;
  /** @type {boolean} set once the rule has left the stylesheet */
  #departed = false;
  /** @type {Slot | undefined} the slot the rule stands in, once placed */
  #slot;
  /** @type {BlockRecord | null} the record of the rule's children, when it holds a rule or an at-rule */
  #block = null;

  /**
   * @param {string[]} selectors
   * @param {Declaration[]} declarations
   */
  constructor(selectors, declarations) {
    this.#selectors = selectors;
    this.#declarations = declarations;
    this.#vendor = undefined;
    this.#selectorText = undefined;
    this.#declarationKeys = undefined;
    this.#elementKeys = undefined;
    this.#pieces = undefined;
    this.#slot = undefined;
  }

  /**
   * The slot the rule stands in. It stays readable after the rule departs, so
   * an edit can still find where the rule stood.
   *
   * @return {Slot | undefined}
   */
  get slot() {
    return this.#slot;
  }

  /**
   * The record of the rule's children, or null when it holds no rule or
   * at-rule. Readable after departure, as `slot` is.
   *
   * @return {BlockRecord | null}
   */
  get block() {
    return this.#block;
  }

  /** @param {Slot} slot the slot the rule now stands in */
  place(slot) {
    this.#slot = slot;
  }

  /** @param {BlockRecord} block the record of the rule's children */
  setBlock(block) {
    this.#block = block;
  }

  /** @return {boolean} whether the rule has left the stylesheet; reading it does not throw */
  get departed() {
    return this.#departed;
  }

  /** @return {string[]} change it only through the methods of this class */
  get selectors() {
    this.#assertLive();
    return this.#selectors;
  }

  /** @return {Declaration[]} */
  get declarations() {
    this.#assertLive();
    return this.#declarations;
  }

  /**
   * @return {RangePiece[] | null | undefined} undefined until the caller
   * sets them, and null when the token ranges of the selectors are not known
   */
  get pieces() {
    this.#assertLive();
    return this.#pieces;
  }

  /** @param {RangePiece[] | null} pieces one per selector, or null */
  setPieces(pieces) {
    this.#assertLive();
    this.#pieces = pieces;
  }

  /**
   * Takes the declarations of the rule as its own list, which the caller
   * keeps extending in place. The keys are derived again on the next read.
   *
   * @param {Declaration[]} declarations
   */
  takeDeclarations(declarations) {
    this.#assertLive();
    this.#declarations = declarations;
    this.#declarationKeys = undefined;
  }

  /**
   * Numbers the declarations so equal ones share a key. The numbering is
   * the caller's, and the keys last until the declarations change; adding
   * selectors leaves them valid.
   *
   * @param {(declaration: Declaration) => number} keyOf
   * @return {RuleDeclarationKeys}
   */
  declarationKeys(keyOf) {
    this.#assertLive();
    if (!this.#declarationKeys) {
      const keys = this.#declarations.map(keyOf);
      this.#declarationKeys = { keys, keySet: new Set(keys) };
    }
    return this.#declarationKeys;
  }

  /**
   * @param {SelectorLookup} lookup
   * @return {VendorPrefixSummary}
   */
  vendorProfile(lookup) {
    this.#assertLive();
    if (this.#vendor === undefined) {
      // A loop, since `map` would pass each index to a lookup that takes a rule.
      const infos = [];
      for (const selector of this.#selectors) infos.push(lookup(selector));
      this.#vendor = VendorPrefixSummary.of(infos);
    }
    return this.#vendor;
  }

  /**
   * The elements the selector list can match, as `elementKeyOf` in
   * `elementKeys.js` describes them, or null when any selector has no key or
   * there are none, which must not read as a rule that writes to no element.
   * A caller must not hold the list across a change to the rule.
   *
   * @param {(selector: string, piece: RangePiece | null) => string | null} [keyOf] the key of one selector
   * @return {string[] | null}
   */
  elementKeys(keyOf = elementKeyOf) {
    this.#assertLive();
    if (this.#elementKeys === undefined) {
      this.#elementKeys = { list: [], seen: new Set() };
      this.#addElementKeys(0, keyOf);
    }
    return this.#elementKeys?.list.length ? this.#elementKeys.list : null;
  }

  /**
   * Adds the keys of the selectors from index `from` on, each with its token
   * range when the rule holds one.
   *
   * @param {number} from
   * @param {(selector: string, piece: RangePiece | null) => string | null} keyOf
   */
  #addElementKeys(from, keyOf) {
    const keys = this.#elementKeys;
    if (!keys) return;
    const selectors = this.#selectors;
    for (let index = from; index < selectors.length; index++) {
      const key = keyOf(selectors[index], this.#pieces?.[index] ?? null);
      if (key === null) {
        this.#elementKeys = null;
        return;
      }
      if (!keys.seen.has(key)) {
        keys.seen.add(key);
        keys.list.push(key);
      }
    }
  }

  /**
   * @param {number} from
   * @param {(selector: string, piece: RangePiece | null) => string | null} keyOf
   * @return {readonly string[] | null}
   */
  #gainElementKeys(from, keyOf) {
    const listed = this.#elementKeys?.list.length;
    this.#addElementKeys(from, keyOf);
    const list = this.#elementKeys?.list;
    if (listed === undefined || list === undefined) return null;
    return list.length === listed ? noElementKeys : list.slice(listed);
  }

  /** @return {string} */
  selectorText() {
    this.#assertLive();
    this.#selectorText ??= this.#selectors.join(',');
    return this.#selectorText;
  }

  /**
   * Lists of different lengths differ in text too, since a selector holds no
   * top-level comma, so the text of long lists is joined only when needed.
   *
   * @param {RuleMeta} other
   * @return {boolean}
   */
  hasSameSelectors(other) {
    this.#assertLive();
    other.#assertLive();
    return (
      this.#selectors.length === other.#selectors.length &&
      this.selectorText() === other.selectorText()
    );
  }

  /**
   * @param {string[]} selectors appended to the rule's selector list
   * @param {SelectorLookup} lookup
   * @param {(selector: string, piece: RangePiece | null) => string | null} [keyOf]
   * @param {RangePiece[] | null} [pieces] the token range of each selector of
   * the rule after the call, or null when they are not known
   * @return {readonly string[] | null} the element keys the selectors add to
   * those listed, or null when the rule's elements are not listed
   */
  addSelectors(selectors, lookup, keyOf = elementKeyOf, pieces = null) {
    this.#assertLive();
    this.#selectorText = undefined;
    const from = this.#selectors.length;
    for (const selector of selectors) {
      this.#selectors.push(selector);
      this.#vendor?.add(lookup(selector));
    }
    this.#pieces = pieces;
    return this.#gainElementKeys(from, keyOf);
  }

  /**
   * @param {string[]} selectors replaces the rule's selector list
   * @param {VendorPrefixSummary} [vendor] the profile of `selectors` when the caller
   * already knows it; otherwise it is derived on the next `vendorProfile`
   */
  setSelectors(selectors, vendor) {
    this.#assertLive();
    this.#selectors = selectors;
    this.#selectorText = undefined;
    this.#vendor = vendor;
    this.#elementKeys = undefined;
    this.#pieces = undefined;
  }

  /**
   * Takes the place of a rule that is dropped and stood before this one, so
   * its selectors come first. The dropped rule's list grows in place and
   * passes to this one, and the joined text is concatenated from the two
   * texts: copying or re-joining a long list on every merge would take
   * quadratic time.
   *
   * @param {RuleMeta} earlier left unusable
   * @param {SelectorLookup} lookup
   * @param {(selector: string, piece: RangePiece | null) => string | null} [keyOf]
   */
  absorbEarlier(earlier, lookup, keyOf = elementKeyOf) {
    this.#assertLive();
    earlier.#assertLive();
    const text = `${earlier.selectorText()},${this.selectorText()}`;
    const vendor = earlier
      .vendorProfile(lookup)
      .concat(this.vendorProfile(lookup));
    const selectors = earlier.#selectors;
    const from = selectors.length;
    const own = this.#selectors;
    for (const selector of own) selectors.push(selector);
    this.#selectors = selectors;
    this.#selectorText = text;
    this.#vendor = vendor;
    // Grows the earlier rule's pieces in place, as its selectors grow.
    const earlierPieces = earlier.#pieces;
    const ownPieces = this.#pieces;
    if (earlierPieces && ownPieces) {
      for (const piece of ownPieces) earlierPieces.push(piece);
      this.#pieces = earlierPieces;
    } else {
      this.#pieces = null;
    }
    // Extends the earlier rule's keys only if they are known: deriving them
    // from a long list would repeat on every merge.
    this.#elementKeys = earlier.#elementKeys;
    this.#addElementKeys(from, keyOf);
    earlier.#departed = true;
  }

  /** Marks the record of a rule that left the stylesheet, so a later read throws. */
  depart() {
    this.#departed = true;
  }

  /** @throws {Error} when the rule this record describes has left the stylesheet */
  #assertLive() {
    if (this.#departed) throw new Error('read of a departed rule record');
  }
}

/**
 * @param {Rule} rule
 * @param {WeakMap<Rule, RuleMeta>} [ruleMeta]
 * @return {RuleMeta}
 */
export function getMeta(rule, ruleMeta) {
  if (ruleMeta && rule) {
    let meta = ruleMeta.get(rule);
    if (!meta && rule.nodes) {
      meta = new RuleMeta(rule.selectors, rule.nodes.filter(isDeclaration));
      ruleMeta.set(rule, meta);
    }
    return meta ?? new RuleMeta([], []);
  }
  return new RuleMeta(
    rule?.selectors ?? [],
    rule?.nodes?.filter(isDeclaration) ?? []
  );
}

/** @param {Rule} rule @return {Declaration[]} */
export function getDecls(rule) {
  return rule.nodes.filter(isDeclaration);
}
