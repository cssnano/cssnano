import cssnanoUtils from 'cssnano-utils';
import { canMerge, partialMerge } from './merge.js';
import {
  declarationIsEqual,
  propertyNameKey,
  sameDeclarationsAndOrder,
} from './declarations.js';
import { isConflictingProp } from './propertyRelations.js';
import { getDecls, getMeta } from './rule-meta.js';
import { mergeParents } from './rule-rewrite.js';
import runWorklist from './worklist.js';

const { sameParent } = cssnanoUtils;

/** @import {Rule} from 'postcss' */
/** @import {RuleMeta} from './rule-meta.js' */
/** @typedef {{previous: Rule | null, replacements: Rule[], next: Rule | null, movedAcrossParents: boolean, kind: 'equal-declaration' | 'equal-selector' | 'partial'}} MutationOutcome */

/** @param {Rule | null} rule @param {import('postcss').Container<import('postcss').ChildNode>} container */
function isDescendant(rule, container) {
  /** @type {import('postcss').Container<import('postcss').ChildNode> | undefined} */
  let parent = rule ? getParent(rule) : undefined;
  for (
    ;
    parent;
    parent =
      /** @type {import('postcss').Container<import('postcss').ChildNode> | undefined} */ (
        parent.parent
      )
  ) {
    if (parent === container) return true;
  }
  return false;
}

/** @param {Rule | import('postcss').Container<import('postcss').ChildNode>} node @return {import('postcss').Container<import('postcss').ChildNode> | undefined} */
function getParent(node) {
  return /** @type {import('postcss').Container<import('postcss').ChildNode> | undefined} */ (
    node.parent
  );
}

/** @param {Map<import('postcss').Container, {first: Rule | null, last: Rule | null}>} captured @param {Rule[]} replaced @param {'first'|'last'} edge */
function replacedBoundary(captured, replaced, edge) {
  for (const boundary of captured.values()) {
    const rule = boundary[edge];
    if (rule && replaced.includes(rule)) return true;
  }
  return false;
}

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
  /** @typedef {RuleMeta & {selectorKey: string, contentKey: string, declarationIds: number[], declarationIdSet: Set<number>, previous: Rule | null, next: Rule | null, active: boolean, version: number, sourceOrder: number}} ActiveMeta */
  /** @type {WeakMap<Rule, ActiveMeta>} */
  const active = new WeakMap();
  /** @type {Map<string, number>} */
  const declarationIds = new Map();
  let nextDeclarationId = 0;
  let nextSourceOrder = 0;
  /** @typedef {{first: Rule | null, last: Rule | null}} Boundary */
  /** @type {WeakMap<import('postcss').Container, Boundary>} */
  const boundaries = new WeakMap();

  /** @param {import('postcss').Declaration} declaration */
  function getDeclarationId(declaration) {
    const key = `${propertyNameKey(declaration.prop)}:${declaration.value}:${declaration.important}`;
    let id = declarationIds.get(key);
    if (id === undefined) {
      id = nextDeclarationId++;
      declarationIds.set(key, id);
    }
    return id;
  }

  /** @param {Rule} rule @param {number} [sourceOrder] */
  function refresh(rule, sourceOrder) {
    const previous = active.get(rule);
    const base = getMeta(rule, ruleMeta);
    const ids = base.declarations.map(getDeclarationId);
    /** @type {ActiveMeta} */
    const meta = Object.assign(base, {
      selectorKey: base.selectors.join(','),
      contentKey: `${base.selectors.join(',')}|${ids.join(',')}`,
      declarationIds: ids,
      declarationIdSet: new Set(ids),
      previous: previous?.previous ?? null,
      next: previous?.next ?? null,
      active: true,
      version: (previous?.version ?? 0) + 1,
      sourceOrder: sourceOrder ?? previous?.sourceOrder ?? nextSourceOrder++,
    });
    active.set(rule, meta);
    return meta;
  }

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

  /** @param {Rule} rule */
  function detach(rule) {
    const meta = active.get(rule);
    if (!meta?.active) return;
    const { previous, next } = meta;
    let container = getParent(rule);
    for (; container; container = getParent(container)) {
      const boundary = boundaries.get(container);
      if (!boundary) continue;
      if (boundary.first === rule)
        boundary.first = next && isDescendant(next, container) ? next : null;
      if (boundary.last === rule)
        boundary.last =
          previous && isDescendant(previous, container) ? previous : null;
    }
    if (previous) {
      const previousMeta = active.get(previous);
      if (previousMeta) previousMeta.next = next;
    }
    if (next) {
      const nextMeta = active.get(next);
      if (nextMeta) nextMeta.previous = previous;
    }
    meta.active = false;
  }

  /** @param {Rule[]} rules */
  function captureBoundaries(rules) {
    const captured = new Map();
    for (const rule of rules) {
      for (
        let container = getParent(rule);
        container;
        container = getParent(container)
      ) {
        const boundary = boundaries.get(container);
        if (boundary && !captured.has(container))
          captured.set(container, {
            first: boundary.first,
            last: boundary.last,
          });
      }
    }
    return captured;
  }

  /** @param {import('postcss').Container} parent */
  function ancestors(parent) {
    /** @type {import('postcss').Container<import('postcss').ChildNode>[]} */
    const result = [];
    /** @type {import('postcss').Container<import('postcss').ChildNode> | undefined} */
    let container = parent;
    for (; container; container = getParent(container)) result.push(container);
    return result;
  }

  /** @param {Rule | null} previous @param {Rule | null} next */
  function unlink(previous, next) {
    if (previous) {
      const previousMeta = active.get(previous);
      if (previousMeta) previousMeta.next = next;
    }
    if (next) {
      const nextMeta = active.get(next);
      if (nextMeta) nextMeta.previous = previous;
    }
  }

  /** @param {Rule} rule @param {import('postcss').Container} oldParent @param {import('postcss').Container} newParent */
  function repairMove(rule, oldParent, newParent) {
    const meta = active.get(rule);
    if (!meta?.active) return;
    const { previous, next } = meta;
    unlink(previous, next);
    for (const ancestor of ancestors(oldParent)) {
      const boundary = boundaries.get(ancestor);
      if (!boundary) continue;
      if (boundary.first === rule)
        boundary.first = next && isDescendant(next, ancestor) ? next : null;
      if (boundary.last === rule)
        boundary.last =
          previous && isDescendant(previous, ancestor) ? previous : null;
    }
    linkMovedRule(rule, meta, newParent);
  }

  /** @param {Rule} rule @param {ActiveMeta} meta @param {import('postcss').Container} newParent */
  function linkMovedRule(rule, meta, newParent) {
    const destinationLast = boundaries.get(newParent)?.last ?? null;
    meta.previous = destinationLast;
    meta.next = destinationLast
      ? (active.get(destinationLast)?.next ?? null)
      : null;
    if (destinationLast) {
      const destinationMeta = active.get(destinationLast);
      if (destinationMeta) destinationMeta.next = rule;
    }
    if (meta.next) {
      const nextMeta = active.get(meta.next);
      if (nextMeta) nextMeta.previous = rule;
    }
    for (const ancestor of ancestors(newParent)) {
      const boundary = boundaries.get(ancestor);
      if (!boundary) continue;
      boundary.first ??= rule;
      boundary.last = rule;
    }
  }

  /** @param {import('postcss').Container<import('postcss').ChildNode>} container @param {{previous: Rule | null}} state */
  function indexContainer(container, state) {
    let first = null;
    let last = null;
    for (const node of container.nodes ?? []) {
      if (node.type === 'rule') {
        const rule = /** @type {Rule} */ (node);
        const meta = refresh(rule);
        meta.previous = state.previous;
        if (state.previous)
          /** @type {ActiveMeta} */ (active.get(state.previous)).next = rule;
        meta.next = null;
        first ??= rule;
        state.previous = rule;
        last = rule;
        indexContainer(rule, state);
        const nested = boundaries.get(rule);
        if (nested?.last) last = nested.last;
        state.previous = last;
        boundaries.set(rule, { first: rule, last });
        continue;
      }
      if ('nodes' in node && node.nodes) {
        indexContainer(node, state);
        const nested = boundaries.get(node);
        if (nested?.first) {
          if (!first) first = nested.first;
          last = nested.last;
        }
      }
    }
    boundaries.set(container, { first, last });
  }

  /** @param {import('postcss').Root} root */
  function seed(root) {
    indexContainer(root, { previous: null });
    return boundaries.get(root)?.first ?? null;
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

  /** @param {Rule[]} replacements @param {Rule | null} previous @param {Rule | null} next @param {number | undefined} sourceOrder */
  function linkReplacements(replacements, previous, next, sourceOrder) {
    let prior = previous;
    for (const replacement of replacements) {
      const meta = refresh(replacement, sourceOrder);
      meta.previous = prior;
      if (prior)
        /** @type {ActiveMeta} */ (active.get(prior)).next = replacement;
      prior = replacement;
    }
    if (prior) /** @type {ActiveMeta} */ (active.get(prior)).next = next;
    if (next) /** @type {ActiveMeta} */ (active.get(next)).previous = prior;
  }

  /** @param {Rule} replacement @param {'first'|'last'} edge */
  function updateAncestorBoundaries(replacement, edge) {
    for (
      let container = getParent(replacement);
      container;
      container = getParent(container)
    ) {
      const boundary = boundaries.get(container);
      if (boundary) boundary[edge] = replacement;
    }
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
