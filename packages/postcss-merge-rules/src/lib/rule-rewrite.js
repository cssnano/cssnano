import { intersect, indexOfDeclaration } from './declarations.js';
import { flush, getMeta } from './rule-meta.js';

/** @import {Declaration, Rule} from 'postcss' */

/**
 * @param {Rule} first
 * @param {Rule} second
 * @return {boolean}
 */
export function mergeParents(first, second) {
  if (!first.parent || !second.parent || first.parent === second.parent) {
    return false;
  }
  second.remove();
  first.parent.append(second);
  return true;
}

/** @param {Rule} second @return {Rule | null} */
function getNextRule(second) {
  let nextRule = second.next();
  if (!nextRule) {
    const parentSibling =
      /** @type {import('postcss').Container | undefined} */ (
        /** @type {import('postcss').Container<import('postcss').ChildNode>} */ (
          second.parent
        ).next()
      );
    nextRule = parentSibling && parentSibling.nodes && parentSibling.nodes[0];
  }
  return nextRule?.type === 'rule' ? nextRule : null;
}

/**
 * @param {...Rule} rules
 * @return {number}
 */
function ruleLength(...rules) {
  return rules.map((r) => (r.nodes.length ? String(r) : '')).join('').length;
}

/**
 * @param {Rule} first
 * @param {Rule} second
 * @param {Declaration[]} intersection
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, import('./rule-meta.js').RuleMeta>} ruleMeta
 * @param {(a: Rule, b: Rule, browsers: string[], compatibilityCache: Map<string, boolean>, ruleCache: WeakSet<Rule>, ruleMeta: WeakMap<Rule, import('./rule-meta.js').RuleMeta>) => boolean} canMerge
 * @param {(rule: Rule, oldParent: import('postcss').Container, newParent: import('postcss').Container) => void} [onMove]
 * @return {{first: Rule, second: Rule, intersection: Declaration[], moved: boolean}}
 */
export function mergeWithNextRule(
  first,
  second,
  intersection,
  browsers,
  compatibilityCache,
  ruleCache,
  ruleMeta,
  canMerge,
  onMove
) {
  const nextRule = getNextRule(second);
  if (
    !nextRule ||
    !canMerge(
      second,
      nextRule,
      browsers,
      compatibilityCache,
      ruleCache,
      ruleMeta
    )
  ) {
    return { first, second, intersection, moved: false };
  }
  const nextIntersection = intersect(
    getMeta(second, ruleMeta).declarations,
    getMeta(nextRule, ruleMeta).declarations
  );
  if (nextIntersection.length <= intersection.length) {
    return { first, second, intersection, moved: false };
  }
  const oldParent = nextRule.parent;
  const newParent = second.parent;
  const moved = mergeParents(second, nextRule);
  if (moved && oldParent && newParent) onMove?.(nextRule, oldParent, newParent);
  return {
    first: second,
    second: nextRule,
    intersection: nextIntersection,
    moved,
  };
}

/**
 * @param {Rule} first
 * @param {Rule} second
 * @param {Declaration[]} intersection
 * @param {Set<number>} claimedIndices
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, import('./rule-meta.js').RuleMeta>} ruleMeta
 * @return {{rule: Rule, replacements: Rule[]}}
 */
export function buildMergedRule(
  first,
  second,
  intersection,
  claimedIndices,
  ruleCache,
  ruleMeta
) {
  const receivingBlock = second.clone();
  const firstSelectors = getMeta(first, ruleMeta).selectors;
  const secondSelectors = getMeta(second, ruleMeta).selectors;
  receivingBlock.selector = [...firstSelectors, ...secondSelectors].join();
  receivingBlock.nodes = [];
  /** @type {import('postcss').Container<import('postcss').ChildNode>} */ (
    second.parent
  ).insertBefore(second, receivingBlock);
  const firstClone = first.clone({ selectors: firstSelectors });
  const secondClone = second.clone({ selectors: secondSelectors });
  firstClone.walkDecls((decl) => {
    if (indexOfDeclaration(intersection, decl) !== -1) {
      decl.remove();
      receivingBlock.append(decl);
    }
  });
  let laterIndex = 0;
  secondClone.walkDecls((decl) => {
    if (claimedIndices.has(laterIndex++)) {
      decl.remove();
    }
  });
  flush(first, ruleMeta);
  flush(second, ruleMeta);
  const merged = ruleLength(firstClone, receivingBlock, secondClone);
  const original = ruleLength(first, second);
  if (merged < original) {
    first.replaceWith(firstClone);
    second.replaceWith(secondClone);
    for (const rule of [firstClone, receivingBlock, secondClone]) {
      if (rule.nodes.length === 0) rule.remove();
    }
    if (!secondClone.parent) {
      ruleCache?.add(receivingBlock);
      return {
        rule: receivingBlock,
        replacements: [firstClone, receivingBlock].filter((rule) =>
          Boolean(rule.parent)
        ),
      };
    }
    ruleCache?.add(receivingBlock);
    ruleCache?.add(secondClone);
    ruleMeta?.delete(first);
    ruleMeta?.delete(second);
    return {
      rule: secondClone,
      replacements: [firstClone, receivingBlock, secondClone].filter((rule) =>
        Boolean(rule.parent)
      ),
    };
  }
  receivingBlock.remove();
  return { rule: second, replacements: [] };
}
