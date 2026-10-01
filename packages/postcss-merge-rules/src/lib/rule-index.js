import { propertyNameKey } from './declarations.js';
import { getMeta } from './rule-meta.js';

/** @import {Rule} from 'postcss' */
/** @import {RuleMeta} from './rule-meta.js' */
/** @typedef {{first: Rule | null, last: Rule | null}} Boundary */

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
export function replacedBoundary(captured, replaced, edge) {
  for (const boundary of captured.values()) {
    const rule = boundary[edge];
    if (rule && replaced.includes(rule)) return true;
  }
  return false;
}
/**
 * Doubly linked list of the rules in source order, plus the first and last
 * rule of every container, so the worklist can find adjacent merge candidates
 * and keep them current as rules are removed, moved and replaced.
 *
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 */
export default function createRuleIndex(ruleMeta) {
  /** @typedef {RuleMeta & {selectorKey: string, contentKey: string, declarationIds: number[], declarationIdSet: Set<number>, previous: Rule | null, next: Rule | null, active: boolean, version: number, sourceOrder: number}} ActiveMeta */
  /** @type {WeakMap<Rule, ActiveMeta>} */
  const active = new WeakMap();

  /** @type {Map<string, number>} */
  const declarationIds = new Map();

  let nextDeclarationId = 0;

  let nextSourceOrder = 0;

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

  /**
   * When `rule` leaves a container chain, the container boundaries it
   * anchored fall back to its neighbours that remain inside.
   *
   * @param {import('postcss').Container | undefined} start
   * @param {Rule} rule
   * @param {Rule | null} previous
   * @param {Rule | null} next
   */
  function resetBoundaries(start, rule, previous, next) {
    for (let container = start; container; container = getParent(container)) {
      const boundary = boundaries.get(container);
      if (!boundary) continue;
      if (boundary.first === rule)
        boundary.first = next && isDescendant(next, container) ? next : null;
      if (boundary.last === rule)
        boundary.last =
          previous && isDescendant(previous, container) ? previous : null;
    }
  }

  /** @param {Rule} rule */
  function detach(rule) {
    const meta = active.get(rule);
    if (!meta?.active) return;
    const { previous, next } = meta;
    resetBoundaries(getParent(rule), rule, previous, next);
    unlink(previous, next);
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
    resetBoundaries(oldParent, rule, previous, next);
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
    /** @type {import('postcss').Container<import('postcss').ChildNode> | undefined} */
    let container = newParent;
    for (; container; container = getParent(container)) {
      const boundary = boundaries.get(container);
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

  return {
    active,
    refresh,
    detach,
    captureBoundaries,
    repairMove,
    seed,
    linkReplacements,
    updateAncestorBoundaries,
  };
}
