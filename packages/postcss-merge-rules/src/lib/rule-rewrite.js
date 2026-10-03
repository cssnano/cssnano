import { declarationIsEqual } from './declarations.js';
import createLastWriteIndex from './lastWriteIndex.js';
import { getDecls, getMeta } from './rule-meta.js';

/** @import {Rule} from 'postcss' */

const CONDITIONAL_GROUP_RULES = new Set(['media', 'supports', 'container']);

/**
 * Moves `second` into the parent of `first`. A conditional group rule it
 * leaves empty applies nothing, so it is removed; keeping it would make every
 * later pair walk across it.
 *
 * @param {Rule} first
 * @param {Rule} second
 * @return {boolean}
 */
export function mergeParents(first, second) {
  if (!first.parent || !second.parent || first.parent === second.parent) {
    return false;
  }
  const previousParent = second.parent;
  second.remove();
  first.parent.append(second);
  if (
    previousParent.type === 'atrule' &&
    CONDITIONAL_GROUP_RULES.has(previousParent.name.toLowerCase()) &&
    !previousParent.nodes.length
  ) {
    previousParent.remove();
  }
  return true;
}

/**
 * Appends the content of `incoming` to `receiving`. A declaration of
 * `incoming` is redundant only when the last declaration of `receiving` that
 * can set the same property already has an identical value. Otherwise it
 * revives an overridden value or overrides intermediate declarations, so
 * appending it is required to preserve the cascade result.
 *
 * @param {Rule} receiving
 * @param {Rule} incoming
 * @return {void}
 */
export function appendDeclarations(receiving, incoming) {
  const kept = getDecls(receiving);
  const index = createLastWriteIndex();
  for (const [position, declaration] of kept.entries()) {
    index.record(declaration, position);
  }
  for (const node of incoming.nodes.slice()) {
    if (node.type === 'decl') {
      const last = index.lastConflict(node);
      if (last !== -1 && declarationIsEqual(kept[last], node)) {
        node.remove();
        continue;
      }
      index.record(node, kept.length);
      kept.push(node);
    }
    receiving.append(node);
  }
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
 * @param {Set<number>} claimedEarlierIndices
 * @param {Set<number>} claimedIndices
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, import('./rule-meta.js').RuleMeta>} ruleMeta
 * @return {{rule: Rule, replacements: Rule[]}}
 */
export function buildMergedRule(
  first,
  second,
  claimedEarlierIndices,
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
  // Index-based removal matches duplicates positionally, symmetric to how
  // `claimedIndices` selects declarations in the later rule.
  let earlierIndex = 0;
  firstClone.walkDecls((decl) => {
    if (claimedEarlierIndices.has(earlierIndex++)) {
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
    ruleMeta.delete(first);
    ruleMeta.delete(second);
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
