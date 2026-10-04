import { canMerge, partialMerge } from './merge.js';
import { sameDeclarationsAndOrder } from './declarations.js';
import {
  getDecls,
  getMeta,
  getSelectorText,
  getVendorProfile,
  hasSameSelectors,
  setSelectors,
} from './rule-meta.js';
import { combineVendorProfiles } from './vendor-profile.js';
import { createSelectorLookup } from './ensureCompatibility.js';
import { appendDeclarations, mergeParents } from './rule-rewrite.js';
import { joinNonAdjacent } from './non-adjacent-merge.js';
import runScan, { createProfileCache } from './scan.js';

/** @import {Rule} from 'postcss' */
/** @import {RuleMeta} from './rule-meta.js' */

/**
 * @param {string[]} browsers
 * @param {Map<string, import('./ensureCompatibility.js').SelectorInfo>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {{ run: (root: import('postcss').Root) => void }}
 */
export default function selectorMerger(
  browsers,
  compatibilityCache,
  ruleCache,
  ruleMeta
) {
  const lookup = createSelectorLookup(browsers, compatibilityCache);

  /**
   * Rules with the same declarations in the same order become one rule with
   * both selectors.
   *
   * @param {Rule} first
   * @param {Rule} second
   * @return {Rule[] | null} the surviving rule
   */
  function mergeMatchingDeclarations(first, second) {
    if (
      !first.nodes.every((node) => node.type === 'decl') ||
      !second.nodes.every((node) => node.type === 'decl') ||
      !sameDeclarationsAndOrder(
        getMeta(second, ruleMeta).declarations,
        getMeta(first, ruleMeta).declarations
      )
    )
      return null;
    // Repeating the same declarations under the same selector changes nothing,
    // and a selector list that repeats the selector is longer than one rule.
    if (hasSameSelectors(getMeta(first, ruleMeta), getMeta(second, ruleMeta))) {
      second.remove();
      ruleMeta.delete(second);
      return [first];
    }
    const metaSecond = getMeta(second, ruleMeta);
    const metaFirst = getMeta(first, ruleMeta);
    // Concatenating strings builds a rope in constant time, whereas joining
    // the grown list on every merge would take quadratic time.
    const selectorText = `${getSelectorText(metaFirst)},${getSelectorText(metaSecond)}`;
    const vendor = combineVendorProfiles(
      getVendorProfile(metaFirst, lookup),
      getVendorProfile(metaSecond, lookup)
    );
    // `first` is removed, so its list grows in place and passes to `second`;
    // copying a long absorbed list on every merge would take quadratic time.
    const selectors = metaFirst.selectors;
    for (const selector of metaSecond.selectors) selectors.push(selector);
    setSelectors(metaSecond, selectors, vendor);
    second.selector = metaSecond.selectorText = selectorText;
    first.remove();
    ruleMeta.delete(first);
    ruleCache?.add(second);
    return [second];
  }

  /**
   * Rules with the same selector become one rule with both declaration lists.
   *
   * @param {Rule} first
   * @param {Rule} second
   * @return {Rule[] | null} the surviving rule
   */
  function mergeMatchingSelectors(first, second) {
    if (!hasSameSelectors(getMeta(first, ruleMeta), getMeta(second, ruleMeta)))
      return null;
    appendDeclarations(first, second);
    getMeta(first, ruleMeta).declarations = getDecls(first);
    second.remove();
    ruleMeta.delete(second);
    return [first];
  }

  /**
   * @param {Rule} first
   * @param {Rule} second
   * @return {Rule[]} the rules that replace the pair, or none when sharing the
   * declarations would not make the output shorter
   */
  function mergeSharedDeclarations(first, second) {
    const { replacements, replaced } = partialMerge(
      first,
      second,
      ruleCache,
      ruleMeta
    );
    for (const rule of replaced) ruleMeta.delete(rule);
    return replacements;
  }

  const canMergeRules = (
    /** @type {Rule} */ first,
    /** @type {Rule} */ second
  ) => canMerge(first, second, lookup, ruleCache, ruleMeta);

  return {
    run(root) {
      // The scan runs first because a join by selector can remove a
      // shared declaration that would have merged more selectors. Its merges
      // can leave same-selector rules apart, so the joins repeat until none apply.
      const profileCache = createProfileCache();
      do {
        runScan(
          root,
          {
            canMerge: canMergeRules,
            mergeParents,
            mergeMatchingDeclarations,
            mergeMatchingSelectors,
            partialMerge: mergeSharedDeclarations,
            ruleMeta,
          },
          profileCache
        );
      } while (
        joinNonAdjacent(root, canMergeRules, ruleMeta, ruleCache, lookup)
      );
    },
  };
}
