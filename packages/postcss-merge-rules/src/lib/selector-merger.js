import cssnanoUtils from 'cssnano-utils';
import { canMerge, partialMerge } from './merge.js';
import {
  declarationIsEqual,
  sameDeclarationsAndOrder,
} from './declarations.js';
import { isConflictingProp } from './propertyRelations.js';
import { getDecls, getMeta } from './rule-meta.js';
import createRuleIndex, { replacedBoundary } from './rule-index.js';
import { mergeParents } from './rule-rewrite.js';
import runWorklist from './worklist.js';

const { sameParent } = cssnanoUtils;

/** @import {Rule} from 'postcss' */
/** @import {RuleMeta} from './rule-meta.js' */
/** @typedef {{previous: Rule | null, replacements: Rule[], next: Rule | null, movedAcrossParents: boolean, kind: 'equal-declaration' | 'equal-selector' | 'partial'}} MutationOutcome */
/** @import {Boundary} from './rule-index.js' */

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
  const {
    active,
    refresh,
    detach,
    captureBoundaries,
    repairMove,
    seed,
    linkReplacements,
    updateAncestorBoundaries,
  } = createRuleIndex(ruleMeta);

  /** @param {Rule} first @param {Rule} second */
  function hasPossibleSharedDeclaration(first, second) {
    const a = active.get(first);
    const b = active.get(second);
    if (!a?.active || !b?.active) return false;
    const structuralRewrite =
      (a.declarations.length === 0 && b.declarations.length === 0) ||
      (first.parent !== second.parent && sameParent(first, second));
    if (a.selectorKey === b.selectorKey || structuralRewrite) return true;
    const smaller = a.declarationIds.length <= b.declarationIds.length ? a : b;
    const larger = smaller === a ? b.declarationIdSet : a.declarationIdSet;
    for (const id of smaller.declarationIds) {
      if (larger.has(id)) return true;
    }
    return false;
  }

  /** @param {Rule} first @param {Rule} second */
  function estimatedBenefit(first, second) {
    const a = active.get(first);
    const b = active.get(second);
    if (!a || !b) return 0;
    if (a.selectorKey === b.selectorKey)
      return a.declarationIds.length + b.declarationIds.length;
    let benefit = 0;
    const smaller = a.declarationIds.length <= b.declarationIds.length ? a : b;
    const larger = smaller === a ? b.declarationIdSet : a.declarationIdSet;
    for (const id of smaller.declarationIdSet) {
      if (larger.has(id)) benefit++;
    }
    return benefit;
  }

  /** @param {Rule} first @param {Rule} second @return {MutationOutcome | null} */
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
    const previous = active.get(first)?.previous ?? null;
    const next = active.get(second)?.next ?? null;
    const metaSecond = getMeta(second, ruleMeta);
    metaSecond.selectors = [
      ...getMeta(first, ruleMeta).selectors,
      ...metaSecond.selectors,
    ];
    second.selector = metaSecond.selectors.join(',');
    detach(first);
    first.remove();
    ruleMeta?.delete(first);
    refresh(second);
    ruleCache?.add(second);
    return {
      previous,
      replacements: [second],
      next,
      movedAcrossParents: false,
      kind: 'equal-declaration',
    };
  }

  /** @param {Rule} first @param {Rule} second @return {MutationOutcome | null} */
  function mergeMatchingSelectors(first, second) {
    if (
      getMeta(first, ruleMeta).selectors.join(',') !==
      getMeta(second, ruleMeta).selectors.join(',')
    )
      return null;
    const previous = active.get(first)?.previous ?? null;
    const next = active.get(second)?.next ?? null;
    const cachedDecls = getMeta(first, ruleMeta).declarations;
    second.walk((node) => {
      if (node.type === 'decl') {
        // A declaration from `second` is redundant only when the last
        // declaration of `first` that can set the same property already has
        // an identical value. Otherwise it revives an overridden value or
        // overrides intermediate declarations, so appending it is required
        // to preserve the cascade result.
        const lastConflicting = cachedDecls.findLast((decl) =>
          isConflictingProp(decl.prop, node.prop)
        );
        if (lastConflicting && declarationIsEqual(lastConflicting, node)) {
          node.remove();
          return;
        }
        cachedDecls.push(node);
      }
      first.append(node);
    });
    getMeta(first, ruleMeta).declarations = getDecls(first);
    detach(second);
    second.remove();
    ruleMeta?.delete(second);
    refresh(first);
    return {
      previous,
      replacements: [first],
      next,
      movedAcrossParents: false,
      kind: 'equal-selector',
    };
  }

  /** @param {ReturnType<typeof partialMerge>} outcome @param {Map<import('postcss').Container, Boundary>} captured @param {boolean} movedAcrossParents @return {MutationOutcome | null} */
  function installPartialMerge(outcome, captured, movedAcrossParents) {
    if (!outcome.replacements.length) return null;
    const firstWasBoundary =
      !movedAcrossParents &&
      replacedBoundary(captured, outcome.replaced, 'first');
    const lastWasBoundary =
      !movedAcrossParents &&
      replacedBoundary(captured, outcome.replaced, 'last');
    const previous = active.get(outcome.replaced[0])?.previous ?? null;
    const lastReplaced = /** @type {Rule} */ (outcome.replaced.at(-1));
    const next = active.get(lastReplaced)?.next ?? null;
    const sourceOrder = active.get(outcome.replaced[0])?.sourceOrder;
    for (const rule of outcome.replaced) {
      detach(rule);
      ruleMeta?.delete(rule);
    }
    linkReplacements(outcome.replacements, previous, next, sourceOrder);
    const firstReplacement = outcome.replacements[0];
    const lastReplacement = /** @type {Rule} */ (outcome.replacements.at(-1));
    if (firstWasBoundary && firstReplacement.parent)
      updateAncestorBoundaries(firstReplacement, 'first');
    if (lastWasBoundary && lastReplacement.parent)
      updateAncestorBoundaries(lastReplacement, 'last');
    return {
      previous,
      replacements: outcome.replacements,
      next,
      movedAcrossParents,
      kind: 'partial',
    };
  }

  /** @param {{first: Rule, second: Rule, firstVersion: number, secondVersion: number}} candidate */
  function isCurrentCandidate(candidate) {
    const firstMeta = active.get(candidate.first);
    const secondMeta = active.get(candidate.second);
    return Boolean(
      firstMeta?.active &&
      secondMeta?.active &&
      firstMeta.next === candidate.second &&
      firstMeta.version === candidate.firstVersion &&
      secondMeta.version === candidate.secondVersion
    );
  }

  return {
    run(root) {
      runWorklist(root, {
        active,
        hasPossibleSharedDeclaration,
        estimatedBenefit,
        seed,
        isCurrentCandidate,
        canMerge: (first, second) =>
          canMerge(
            first,
            second,
            browsers,
            compatibilityCache,
            ruleCache,
            ruleMeta
          ),
        mergeParents,
        repairMove,
        mergeMatchingDeclarations,
        mergeMatchingSelectors,
        captureBoundaries,
        partialMerge: (first, second) =>
          partialMerge(first, second, ruleCache, ruleMeta),
        installPartialMerge,
        refresh,
      });
    },
  };
}
