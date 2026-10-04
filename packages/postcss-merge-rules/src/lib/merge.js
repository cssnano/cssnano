import cssnanoUtils from 'cssnano-utils';
import { selectorsCompatible } from './ensureCompatibility.js';
import { vendorsAllowMerge } from './vendor-profile.js';
import { filterRuleIntersections, intersect } from './declarations.js';
import { getMeta, getVendorProfile } from './rule-meta.js';
import { buildMergedRule } from './rule-rewrite.js';

const { asciiLowerCase, sameParent } = cssnanoUtils;

/** @import {Rule} from 'postcss' */
/** @import {RuleMeta} from './rule-meta.js' */

/** @param {import('postcss').ChildNode} node @return {boolean} */
function isRuleOrAtRule(node) {
  return node.type === 'rule' || node.type === 'atrule';
}

/**
 * @param {Rule} ruleA
 * @param {Rule} ruleB
 * @param {import('./rule-meta.js').SelectorLookup} lookup
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {boolean}
 */
export function canMerge(ruleA, ruleB, lookup, ruleCache, ruleMeta) {
  const parent = sameParent(ruleA, ruleB);
  if (!parent) return false;
  // Keyframe selectors are cascaded by position.
  if (
    ruleA.parent?.type === 'atrule' &&
    asciiLowerCase(
      /** @type {import('postcss').AtRule} */ (ruleA.parent).name
    ).includes('keyframes')
  )
    return false;
  if (ruleA.some(isRuleOrAtRule) || ruleB.some(isRuleOrAtRule)) return false;

  const metaA = getMeta(ruleA, ruleMeta);
  const metaB = getMeta(ruleB, ruleMeta);
  // Compatibility holds for a concatenated list exactly when it holds for
  // each side, so a long absorbing list is never rescanned. The vendor check
  // follows it, because an incompatible selector has no known prefix.
  return (
    (ruleCache.has(ruleA) || selectorsCompatible(metaA.selectors, lookup)) &&
    (ruleCache.has(ruleB) || selectorsCompatible(metaB.selectors, lookup)) &&
    vendorsAllowMerge(
      getVendorProfile(metaA, lookup),
      getVendorProfile(metaB, lookup)
    )
  );
}

/**
 * @param {Rule} first
 * @param {Rule} second
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {{rule: Rule, replacements: Rule[], replaced: Rule[]}}
 */
export function partialMerge(first, second, ruleCache, ruleMeta) {
  const metaFirst = getMeta(first, ruleMeta);
  const metaSecond = getMeta(second, ruleMeta);
  let intersection = intersect(metaFirst.declarations, metaSecond.declarations);
  if (intersection.length === 0) {
    return {
      rule: second,
      replacements: [],
      replaced: [],
    };
  }
  const mergedFirst = first;
  const mergedSecond = second;
  const earlierRuleDeclarations = [
    ...getMeta(mergedFirst, ruleMeta).declarations,
  ];
  const laterRuleDeclarations = [
    ...getMeta(mergedSecond, ruleMeta).declarations,
  ];
  const filtered = filterRuleIntersections(
    intersection,
    earlierRuleDeclarations,
    laterRuleDeclarations
  );
  intersection = filtered.intersection;
  if (intersection.length === 0) {
    return {
      rule: mergedSecond,
      replacements: [],
      replaced: [],
    };
  }
  const merged = buildMergedRule(
    mergedFirst,
    mergedSecond,
    filtered.claimedEarlierIndices,
    filtered.claimedIndices,
    ruleCache,
    ruleMeta
  );
  return {
    ...merged,
    replaced: merged.replacements.length ? [mergedFirst, mergedSecond] : [],
  };
}
