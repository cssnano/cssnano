import { canMerge, partialMerge } from './merge.js';
import { sameDeclarationsAndOrder } from './declarations.js';
import { getDecls, getMeta } from './rule-meta.js';
import { appendDeclarations, mergeParents } from './rule-rewrite.js';
import { joinNonAdjacent } from './non-adjacent-merge.js';
import runScan, { createProfileCache } from './scan.js';

/** @import {Rule} from 'postcss' */
/** @import {RuleMeta} from './rule-meta.js' */

/**
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
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
    if (
      getMeta(first, ruleMeta).selectors.join(',') ===
      getMeta(second, ruleMeta).selectors.join(',')
    ) {
      second.remove();
      ruleMeta.delete(second);
      return [first];
    }
    const metaSecond = getMeta(second, ruleMeta);
    metaSecond.selectors = [
      ...getMeta(first, ruleMeta).selectors,
      ...metaSecond.selectors,
    ];
    second.selector = metaSecond.selectors.join(',');
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
    if (
      getMeta(first, ruleMeta).selectors.join(',') !==
      getMeta(second, ruleMeta).selectors.join(',')
    )
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
  ) =>
    canMerge(first, second, browsers, compatibilityCache, ruleCache, ruleMeta);

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
      } while (joinNonAdjacent(root, canMergeRules, ruleMeta));
    },
  };
}
