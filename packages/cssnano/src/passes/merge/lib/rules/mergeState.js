import {
  createSelectorLookup,
  selectorsCompatible,
} from './ensureCompatibility.js';
import { createElementKeyLookup } from './elementKeys.js';
import { createRunContext } from '../../../ir/runContext.js';
import { getMeta } from './ruleMeta.js';
import { isKeyframes, sameContainer } from './sameContainer.js';

/** @import {Container, Declaration, Rule} from 'postcss' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
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
  /**
   * The keys of the property names this stylesheet's merges compare.
   *
   * @type {PropertyTable}
   */
  properties;
  /** @type {import('./ruleMeta.js').SelectorLookup} */
  #lookup;
  /** @type {WeakSet<Rule>} rules whose selectors are known to be compatible */
  #ruleCache;
  /** @type {WeakMap<Rule, RuleMeta>} */
  #ruleMeta;
  /** @type {import('../../../ir/declarationKey.js').DeclarationKeys} */
  #declarations;
  /** @type {(selector: string) => string | null} */
  #elementKeyOf = createElementKeyLookup();
  // Merging moves only declarations and comments into a rule, so a rule found
  // to hold no rule or at-rule holds none until it is forgotten. A rule that
  // keeps receiving is then not rescanned on every merge.
  /** @type {WeakSet<Rule>} */
  #withoutBlocks = new WeakSet();
  /** @type {Set<Rule> | null} */
  #createdBlocks;
  /**
   * The summaries of the stylesheet's blocks, read by the at-rule joins.
   *
   * @type {import('../../../ir/blockTable.js').BlockTable}
   */
  blocks;

  /**
   * @param {readonly string[]} browsers
   * @param {import('../../../ir/runContext.js').RunContext} [context] the run's state, shared with dedupe
   */
  constructor(browsers, context = createRunContext()) {
    this.#lookup = createSelectorLookup(
      browsers,
      context.selectorCompatibility,
      context.textTable
    );
    this.#ruleCache = context.compatibleRules;
    this.#ruleMeta = context.ruleMeta;
    this.#declarations = context.declarations;
    this.properties = context.properties;
    this.blocks = context.blocks;
    this.#createdBlocks = context.createdBlocks;
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
    this.#withoutBlocks.delete(rule);
  }

  /**
   * @param {Rule} rule
   * @return {boolean} whether the rule holds a rule or an at-rule
   */
  #holdsBlocks(rule) {
    if (this.#withoutBlocks.has(rule)) return false;
    if (rule.some(isRuleOrAtRule)) return true;
    this.#withoutBlocks.add(rule);
    return false;
  }

  /**
   * The elements the rule can match. An arrow function, so it passes as a
   * callback without a closure per call.
   *
   * @param {Rule} rule
   * @return {string[] | null}
   */
  elementKeysOf = (rule) => this.meta(rule).elementKeys(this.#elementKeyOf);

  /**
   * Numbers declarations so equal ones, with the same property, value,
   * importance and hack prefix, share a key for the whole run. An arrow
   * function, so it passes as a callback without a closure per call.
   *
   * @param {Declaration} declaration
   * @return {number}
   */
  declarationKey = (declaration) => this.#declarations.keyOf(declaration);

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
   * Reports a rule a merge created, when the run collects them, so the driver
   * canonicalizes it. A rule no run collects is left alone.
   *
   * @param {Rule} rule
   */
  reportCreated(rule) {
    this.#createdBlocks?.add(rule);
  }

  /**
   * Appends selectors to the rule's selector list, keeping its vendor prefix
   * profile in step.
   *
   * @param {Rule} rule
   * @param {string[]} selectors
   * @return {readonly string[] | null} the element keys the selectors add, or
   * null when the rule's elements are not listed
   */
  addSelectors(rule, selectors) {
    return this.meta(rule).addSelectors(
      selectors,
      this.#lookup,
      this.#elementKeyOf
    );
  }

  /**
   * Gives `later` the selectors of `earlier`, which stands before it and is
   * dropped by the caller.
   *
   * @param {Rule} later
   * @param {Rule} earlier
   */
  absorbEarlier(later, earlier) {
    this.meta(later).absorbEarlier(
      this.meta(earlier),
      this.#lookup,
      this.#elementKeyOf
    );
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
    if (isKeyframes(parentA)) return false;
    if (this.#holdsBlocks(ruleA) || this.#holdsBlocks(ruleB)) return false;

    const metaA = this.meta(ruleA);
    const metaB = this.meta(ruleB);
    // Compatibility holds for a concatenated list exactly when it holds for
    // each side, so a long absorbing list is never rescanned. The vendor check
    // follows it, because an incompatible selector has no known prefix.
    return (
      (this.#ruleCache.has(ruleA) ||
        selectorsCompatible(metaA.selectors, this.#lookup, ruleA)) &&
      (this.#ruleCache.has(ruleB) ||
        selectorsCompatible(metaB.selectors, this.#lookup, ruleB)) &&
      metaA
        .vendorProfile(this.#lookup)
        .allowsMerge(metaB.vendorProfile(this.#lookup))
    );
  }
}
