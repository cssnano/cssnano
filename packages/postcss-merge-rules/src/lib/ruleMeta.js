import { VendorPrefixSummary } from './vendorPrefixSummary.js';

/** @import {Declaration, Rule} from 'postcss' */
/**
 * @typedef {object} RuleDeclarationKeys
 * @property {number[]} keys
 * @property {Set<number>} keySet
 */
/** @typedef {(selector: string) => import('./ensureCompatibility.js').SelectorInfo} SelectorLookup */

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
  }

  /** @return {string[]} change it only through the methods of this class */
  get selectors() {
    return this.#selectors;
  }

  /** @return {Declaration[]} */
  get declarations() {
    return this.#declarations;
  }

  /** @param {Declaration[]} declarations */
  setDeclarations(declarations) {
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
    this.#vendor ??= VendorPrefixSummary.of(this.#selectors.map(lookup));
    return this.#vendor;
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
   * @param {RuleMeta} other
   * @return {boolean}
   */
  hasSameSelectors(other) {
    return (
      this.#selectors.length === other.#selectors.length &&
      this.selectorText() === other.selectorText()
    );
  }

  /**
   * @param {string[]} selectors appended to the rule's selector list
   * @param {SelectorLookup} lookup
   */
  addSelectors(selectors, lookup) {
    this.#selectorText = undefined;
    for (const selector of selectors) {
      this.#selectors.push(selector);
      this.#vendor?.add(lookup(selector));
    }
  }

  /**
   * @param {string[]} selectors replaces the rule's selector list
   * @param {VendorPrefixSummary} [vendor] the profile of `selectors` when the caller
   * already knows it; otherwise it is derived on the next `vendorProfile`
   */
  setSelectors(selectors, vendor) {
    this.#selectors = selectors;
    this.#selectorText = undefined;
    this.#vendor = vendor;
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
   */
  absorbEarlier(earlier, lookup) {
    const text = `${earlier.selectorText()},${this.selectorText()}`;
    const vendor = earlier
      .vendorProfile(lookup)
      .concat(this.vendorProfile(lookup));
    const selectors = earlier.#selectors;
    for (const selector of this.#selectors) selectors.push(selector);
    this.#selectors = selectors;
    this.#selectorText = text;
    this.#vendor = vendor;
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
