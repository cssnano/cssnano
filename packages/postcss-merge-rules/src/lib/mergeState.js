import cssnanoUtils from 'cssnano-utils';
import {
  createSelectorLookup,
  selectorsCompatible,
} from './ensureCompatibility.js';
import { propertyNameKey } from './declarations.js';
import { getMeta } from './ruleMeta.js';

const { asciiLowerCase, sameContainer } = cssnanoUtils;

/** @import {Container, Declaration, Rule} from 'postcss' */
/** @import {RuleMeta} from './ruleMeta.js' */
/** @import {RuleDeclarationKeys} from './ruleMeta.js' */

/** @param {import('postcss').ChildNode} node @return {boolean} */
function isRuleOrAtRule(node) {
  return node.type === 'rule' || node.type === 'atrule';
}

/**
 * The state shared by every merge of one stylesheet.
 */
export default class MergeState {
  /** @type {import('./ruleMeta.js').SelectorLookup} */
  #lookup;
  /** @type {WeakSet<Rule>} */
  #ruleCache;
  /** @type {WeakMap<Rule, RuleMeta>} */
  #ruleMeta;
  /** @type {Map<string, number>} */
  #declarationKeys = new Map();

  /**
   * @param {string[]} browsers
   * @param {Map<string, import('./ensureCompatibility.js').SelectorInfo>} compatibilityCache
   * @param {WeakSet<Rule>} ruleCache rules whose selectors are known to be compatible
   * @param {WeakMap<Rule, RuleMeta>} ruleMeta
   */
  constructor(browsers, compatibilityCache, ruleCache, ruleMeta) {
    this.#lookup = createSelectorLookup(browsers, compatibilityCache);
    this.#ruleCache = ruleCache;
    this.#ruleMeta = ruleMeta;
  }

  /**
   * @param {Rule} rule
   * @return {RuleMeta}
   */
  meta(rule) {
    return getMeta(rule, this.#ruleMeta);
  }

  /**
   * Drops the description of a rule whose selectors or declarations changed
   * or that left the stylesheet. It is rebuilt from the rule when next
   * needed, so a rule that was never described stays so.
   *
   * @param {Rule} rule
   */
  forget(rule) {
    this.#ruleMeta.delete(rule);
  }

  /**
   * Numbers declarations so equal ones, with the same property, value and
   * importance, share a key for the whole stylesheet. An arrow function, so
   * it passes as a callback without a closure per call.
   *
   * @param {Declaration} declaration
   * @return {number}
   */
  declarationKey = (declaration) => {
    const canonical = `${propertyNameKey(declaration.prop)}:${declaration.value}:${declaration.important}`;
    let key = this.#declarationKeys.get(canonical);
    if (key === undefined) {
      key = this.#declarationKeys.size;
      this.#declarationKeys.set(canonical, key);
    }
    return key;
  };

  /**
   * @param {Rule} rule
   * @return {RuleDeclarationKeys}
   */
  declarationKeysOf(rule) {
    return this.meta(rule).declarationKeys(this.declarationKey);
  }

  /**
   * Records that every selector of the rule is compatible with the target
   * browsers, so `canMerge` does not check them again. The caller must have
   * established it: a rule built from selectors that passed `canMerge`
   * qualifies, since a list is compatible exactly when each selector is.
   *
   * @param {Rule} rule
   */
  markCompatible(rule) {
    this.#ruleCache.add(rule);
  }

  /**
   * Appends selectors to the rule's selector list, keeping its vendor prefix
   * profile in step.
   *
   * @param {Rule} rule
   * @param {string[]} selectors
   */
  addSelectors(rule, selectors) {
    this.meta(rule).addSelectors(selectors, this.#lookup);
  }

  /**
   * Gives `later` the selectors of `earlier`, which stands before it and is
   * dropped by the caller.
   *
   * @param {Rule} later
   * @param {Rule} earlier
   */
  absorbEarlier(later, earlier) {
    this.meta(later).absorbEarlier(this.meta(earlier), this.#lookup);
  }

  /**
   * Whether the rules can be merged. `parentA` and `parentB` are where the
   * rules stand, which differs from their `parent` for a rule that moved
   * during the sweep.
   *
   * @param {Rule} ruleA
   * @param {Rule} ruleB
   * @param {Container | undefined} [parentA]
   * @param {Container | undefined} [parentB]
   * @return {boolean}
   */
  canMerge(ruleA, ruleB, parentA = ruleA.parent, parentB = ruleB.parent) {
    if (!sameContainer(parentA, parentB)) return false;
    // Keyframe selectors are cascaded by position.
    if (
      parentA?.type === 'atrule' &&
      asciiLowerCase(
        /** @type {import('postcss').AtRule} */ (parentA).name
      ).includes('keyframes')
    )
      return false;
    if (ruleA.some(isRuleOrAtRule) || ruleB.some(isRuleOrAtRule)) return false;

    const metaA = this.meta(ruleA);
    const metaB = this.meta(ruleB);
    // Compatibility holds for a concatenated list exactly when it holds for
    // each side, so a long absorbing list is never rescanned. The vendor check
    // follows it, because an incompatible selector has no known prefix.
    return (
      (this.#ruleCache.has(ruleA) ||
        selectorsCompatible(metaA.selectors, this.#lookup)) &&
      (this.#ruleCache.has(ruleB) ||
        selectorsCompatible(metaB.selectors, this.#lookup)) &&
      metaA
        .vendorProfile(this.#lookup)
        .allowsMerge(metaB.vendorProfile(this.#lookup))
    );
  }
}
