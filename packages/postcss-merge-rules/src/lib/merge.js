import cssnanoUtils from 'cssnano-utils';
import {
  ensureCompatibility,
  sameVendor,
  noVendor,
} from './ensureCompatibility.js';
import { filterRuleIntersections, intersect } from './declarations.js';
import { flush, getMeta } from './rule-meta.js';
import { buildMergedRule, mergeWithNextRule } from './rule-rewrite.js';

const { sameParent } = cssnanoUtils;

/** @import {Rule} from 'postcss' */
/** @import {RuleMeta} from './rule-meta.js' */

/** @param {import('postcss').ChildNode} node @return {boolean} */
function isRuleOrAtRule(node) {
  return node.type === 'rule' || node.type === 'atrule';
}

/**
 * @param {Rule} ruleA
 * @param {Rule} ruleB
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {boolean}
 */
export function canMerge(
  ruleA,
  ruleB,
  browsers,
  compatibilityCache,
  ruleCache,
  ruleMeta
) {
  const metaA = getMeta(ruleA, ruleMeta);
  const metaB = getMeta(ruleB, ruleMeta);
  const a = metaA.selectors;
  const b = metaB.selectors;
  const selectors = a.concat(b);

  if (ruleCache.has(ruleA) && ruleCache.has(ruleB)) {
    // Both already validated
  } else if (ruleCache.has(ruleA)) {
    if (!ensureCompatibility(b, browsers, compatibilityCache)) return false;
  } else if (ruleCache.has(ruleB)) {
    if (!ensureCompatibility(a, browsers, compatibilityCache)) return false;
  } else if (!ensureCompatibility(selectors, browsers, compatibilityCache)) {
    return false;
  }

  const parent = sameParent(ruleA, ruleB);
  if (
    parent &&
    ruleA.parent?.type === 'atrule' &&
    /** @type {import('postcss').AtRule} */ (ruleA.parent).name.includes(
      'keyframes'
    )
  )
    return false;
  if (ruleA.some(isRuleOrAtRule) || ruleB.some(isRuleOrAtRule)) return false;
  return parent && (selectors.every(noVendor) || sameVendor(a, b));
}

/**
 * @param {Rule} first
 * @param {Rule} second
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @param {(rule: Rule, oldParent: import('postcss').Container, newParent: import('postcss').Container) => void} [onMove]
 * @return {{rule: Rule, replacements: Rule[], replaced: Rule[], changed: Rule[], moved: boolean}}
 */
export function partialMerge(
  first,
  second,
  browsers,
  compatibilityCache,
  ruleCache,
  ruleMeta,
  onMove
) {
  if (ruleMeta) flush(first, ruleMeta);
  const metaFirst = getMeta(first, ruleMeta);
  const metaSecond = getMeta(second, ruleMeta);
  let intersection = intersect(metaFirst.declarations, metaSecond.declarations);
  if (intersection.length === 0) {
    return {
      rule: second,
      replacements: [],
      replaced: [],
      changed: [],
      moved: false,
    };
  }
  const mergedNext = mergeWithNextRule(
    first,
    second,
    intersection,
    browsers,
    compatibilityCache,
    ruleCache,
    ruleMeta,
    canMerge,
    onMove
  );
  const mergedFirst = mergedNext.first;
  const mergedSecond = mergedNext.second;
  intersection = mergedNext.intersection;
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
      changed: mergedNext.moved ? [mergedFirst, mergedSecond] : [],
      moved: mergedNext.moved,
    };
  }
  const merged = buildMergedRule(
    mergedFirst,
    mergedSecond,
    intersection,
    filtered.claimedIndices,
    ruleCache,
    ruleMeta
  );
  return {
    ...merged,
    replaced: merged.replacements.length ? [mergedFirst, mergedSecond] : [],
    changed: mergedNext.moved ? [mergedFirst, mergedSecond] : [],
    moved: mergedNext.moved,
  };
}
