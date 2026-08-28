import getBrowsersList from '#getBrowsersList';
import cssnanoUtils from 'cssnano-utils';
import {
  ensureCompatibility,
  sameVendor,
  noVendor,
} from './lib/ensureCompatibility.js';
import {
  filterRuleIntersections,
  indexOfDeclaration,
  intersect,
  sameDeclarationsAndOrder,
} from './lib/declarations.js';
import { flush, getDecls, getMeta } from './lib/rule-meta.js';
import {
  buildMergedRule,
  mergeParents,
  mergeWithNextRule,
} from './lib/rule-rewrite.js';

/** @import browserslist from 'browserslist' */
const { sameParent } = cssnanoUtils;
/** @import {Declaration, Rule} from 'postcss' */
/**
 * @typedef {Object} RuleMeta
 * @property {string[]} selectors - Array of selector strings for the rule
 * @property {Declaration[]} declarations - Array of declaration nodes for the rule
 * @property {boolean} dirty - Whether the selectors have been modified and need flushing
 */
/**
 * @param {Rule} ruleA
 * @param {Rule} ruleB
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {boolean}
 */
function canMerge(
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
    if (!ensureCompatibility(b, browsers, compatibilityCache)) {
      return false;
    }
  } else if (ruleCache.has(ruleB)) {
    if (!ensureCompatibility(a, browsers, compatibilityCache)) {
      return false;
    }
  } else if (!ensureCompatibility(selectors, browsers, compatibilityCache)) {
    return false;
  }

  const parent = sameParent(ruleA, ruleB);
  if (
    parent &&
    ruleA.parent &&
    ruleA.parent.type === 'atrule' &&
    /** @type {import('postcss').AtRule} */ (ruleA.parent).name.includes(
      'keyframes'
    )
  ) {
    return false;
  }
  if (ruleA.some(isRuleOrAtRule) || ruleB.some(isRuleOrAtRule)) {
    return false;
  }
  return parent && (selectors.every(noVendor) || sameVendor(a, b));
}

/**
 * @param {import('postcss').ChildNode} node
 * @return {boolean}
 */
function isRuleOrAtRule(node) {
  return node.type === 'rule' || node.type === 'atrule';
}

/**
 * @param {Rule | import('postcss').Container<import('postcss').ChildNode>} node
 * @return {import('postcss').Container<import('postcss').ChildNode> | undefined}
 */
function getParent(node) {
  return /** @type {import('postcss').Container<import('postcss').ChildNode> | undefined} */ (
    node.parent
  );
}

/** @param {Rule | null} rule @param {import('postcss').Container<import('postcss').ChildNode>} container */
function isDescendant(rule, container) {
  let parent = rule ? getParent(rule) : undefined;
  for (; parent; parent = getParent(parent)) {
    if (parent === container) return true;
  }
  return false;
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
function partialMerge(
  first,
  second,
  browsers,
  compatibilityCache,
  ruleCache,
  ruleMeta,
  onMove
) {
  if (ruleMeta) {
    flush(first, ruleMeta);
  }
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

  const metaFirstActual = getMeta(mergedFirst, ruleMeta);
  const metaSecondActual = getMeta(mergedSecond, ruleMeta);
  const earlierRuleDeclarations = [...metaFirstActual.declarations];
  const laterRuleDeclarations = [...metaSecondActual.declarations];

  const filtered = filterRuleIntersections(
    intersection,
    earlierRuleDeclarations,
    laterRuleDeclarations
  );
  intersection = filtered.intersection;

  if (intersection.length === 0) {
    // Nothing to merge
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

/**
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {{ run: (root: import('postcss').Root) => void }}
 */
function selectorMerger(browsers, compatibilityCache, ruleCache, ruleMeta) {
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

  /** @param {Declaration} declaration */
  function getDeclarationId(declaration) {
    const key = `${declaration.prop}:${declaration.value}:${declaration.important}`;
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
    // Empty rules and equivalent at-rule boundaries retain the legacy
    // structural rewrites even though they cannot share a declaration.
    const structuralRewrite =
      (a.declarations.length === 0 && b.declarations.length === 0) ||
      (first.parent !== second.parent && sameParent(first, second));
    if (a.selectorKey === b.selectorKey || structuralRewrite) return true;
    for (const id of a.declarationIds) {
      if (b.declarationIdSet.has(id)) return true;
    }
    return false;
  }
  /** @param {Rule} first @param {Rule} second */
  function estimatedBenefit(first, second) {
    const a = active.get(first);
    const b = active.get(second);
    if (!a || !b) return 0;
    if (a.selectorKey === b.selectorKey) {
      return a.declarationIds.length + b.declarationIds.length;
    }
    let benefit = 0;
    for (const id of a.declarationIds) {
      if (b.declarationIdSet.has(id)) benefit++;
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
      if (boundary.first === rule) {
        boundary.first = next && isDescendant(next, container) ? next : null;
      }
      if (boundary.last === rule) {
        boundary.last =
          previous && isDescendant(previous, container) ? previous : null;
      }
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
        if (boundary && !captured.has(container)) {
          captured.set(container, {
            first: boundary.first,
            last: boundary.last,
          });
        }
      }
    }
    return captured;
  }
  /**
   * Repair the active order for a rule moved by mergeParents. The old and new
   * ancestor paths are the only paths whose first/last descendant can change.
   * @param {Rule} rule
   * @param {import('postcss').Container} oldParent
   * @param {import('postcss').Container} newParent
   */
  // eslint-disable-next-line complexity
  function repairMove(rule, oldParent, newParent) {
    const oldAncestors = [];
    /** @type {import('postcss').Container<import('postcss').ChildNode> | undefined} */
    let container = oldParent;
    for (; container; container = getParent(container)) {
      oldAncestors.push(container);
    }
    const newAncestors = [];
    container = newParent;
    for (; container; container = getParent(container)) {
      newAncestors.push(container);
    }

    const meta = active.get(rule);
    if (!meta?.active) return;
    const { previous, next } = meta;
    if (previous) {
      const previousMeta = active.get(previous);
      if (previousMeta) previousMeta.next = next;
    }
    if (next) {
      const nextMeta = active.get(next);
      if (nextMeta) nextMeta.previous = previous;
    }

    for (const ancestor of oldAncestors) {
      const boundary = boundaries.get(ancestor);
      if (!boundary) continue;
      if (boundary.first === rule) {
        boundary.first = next && isDescendant(next, ancestor) ? next : null;
      }
      if (boundary.last === rule) {
        boundary.last =
          previous && isDescendant(previous, ancestor) ? previous : null;
      }
    }

    const destinationBoundary = boundaries.get(newParent);
    const destinationLast = destinationBoundary?.last ?? null;
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

    for (const ancestor of newAncestors) {
      const boundary = boundaries.get(ancestor);
      if (!boundary) continue;
      boundary.first ??= rule;
      boundary.last = rule;
    }
  }
  /** @param {import('postcss').Container<import('postcss').ChildNode>} container @param {boolean} refreshRules @param {{previous: Rule | null}} state */
  function indexContainer(container, refreshRules, state) {
    /** @type {Rule | null} */
    let first = null;
    /** @type {Rule | null} */
    let last = null;
    for (const node of container.nodes ?? []) {
      if (node.type === 'rule') {
        const rule = /** @type {Rule} */ (node);
        const meta = refreshRules
          ? refresh(rule)
          : (active.get(rule) ?? refresh(rule));
        meta.previous = state.previous;
        if (state.previous) {
          /** @type {ActiveMeta} */ (active.get(state.previous)).next = rule;
        }
        meta.next = null;
        first ??= rule;
        state.previous = rule;
        last = rule;
        indexContainer(rule, refreshRules, state);
        const nested = boundaries.get(rule);
        if (nested?.last) last = nested.last;
        state.previous = last;
        boundaries.set(rule, { first: rule, last });
        continue;
      }
      if ('nodes' in node && node.nodes) {
        indexContainer(
          /** @type {import('postcss').Container} */ (node),
          refreshRules,
          state
        );
        const nested = boundaries.get(
          /** @type {import('postcss').Container} */ (node)
        );
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
    // indexContainer establishes links as it descends; this pass only gives
    // the root a stable entry point for the cursor.
    indexContainer(root, true, { previous: null });
    return boundaries.get(root)?.first ?? null;
  }
  return {
    // Keep the heap scheduling and rewrite repair together for the AST mutation.
    // eslint-disable-next-line complexity
    run(root) {
      /** @typedef {{first: Rule, second: Rule, firstVersion: number, secondVersion: number, benefit: number, firstSourceOrder: number, contentKey: string}} Candidate */
      /** @type {Candidate[]} */
      let candidates = [];
      let needsGlobalReseed = false;
      /** @param {Candidate} a @param {Candidate} b */
      // The comparator stays local with the heap's candidate type and ordering contract.
      // eslint-disable-next-line unicorn/consistent-function-scoping
      const comesBefore = (a, b) => {
        if (a.benefit !== b.benefit) return a.benefit > b.benefit;
        if (a.firstSourceOrder !== b.firstSourceOrder) {
          return a.firstSourceOrder < b.firstSourceOrder;
        }
        return a.contentKey < b.contentKey;
      };
      /** @param {Candidate} candidate */
      const pushCandidate = (candidate) => {
        let index = candidates.length;
        candidates.push(candidate);
        while (index > 0) {
          const parent = Math.floor((index - 1) / 2);
          if (comesBefore(candidates[parent], candidate)) break;
          candidates[index] = candidates[parent];
          index = parent;
        }
        candidates[index] = candidate;
      };
      const popCandidate = () => {
        const candidate = candidates[0];
        const last = candidates.pop();
        if (last && candidates.length) {
          let index = 0;
          while (true) {
            const left = index * 2 + 1;
            if (left >= candidates.length) break;
            let child = left;
            const right = left + 1;
            if (
              right < candidates.length &&
              comesBefore(candidates[right], candidates[left])
            )
              child = right;
            if (!comesBefore(candidates[child], last)) break;
            candidates[index] = candidates[child];
            index = child;
          }
          candidates[index] = last;
        }
        return candidate;
      };
      /** @param {Rule | null} first @param {Rule | null} second */
      const enqueue = (first, second) => {
        if (!first || !second || !hasPossibleSharedDeclaration(first, second)) {
          return;
        }
        const firstMeta = active.get(first);
        const secondMeta = active.get(second);
        if (!firstMeta || !secondMeta) return;
        pushCandidate({
          first,
          second,
          firstVersion: firstMeta.version,
          secondVersion: secondMeta.version,
          benefit: estimatedBenefit(first, second),
          firstSourceOrder: firstMeta.sourceOrder,
          contentKey: `${firstMeta.contentKey}|${secondMeta.contentKey}`,
        });
      };
      /** @param {Rule} rule */
      const enqueueNeighbors = (rule) => {
        const meta = active.get(rule);
        if (!meta?.active) return;
        enqueue(meta.previous, rule);
        enqueue(rule, meta.next);
      };
      const reseedCandidates = () => {
        candidates = [];
        const initialRule = seed(root);
        for (
          let rule = initialRule;
          rule;
          rule = active.get(rule)?.next ?? null
        ) {
          enqueue(rule, active.get(rule)?.next ?? null);
        }
      };
      reseedCandidates();
      /** @param {Rule} first @param {Rule} second */
      const checkedCanMerge = (first, second) => {
        return canMerge(
          first,
          second,
          browsers,
          compatibilityCache,
          ruleCache,
          ruleMeta
        );
      };
      while (candidates.length || needsGlobalReseed) {
        if (!candidates.length) {
          needsGlobalReseed = false;
          reseedCandidates();
          if (!candidates.length) break;
        }
        const candidate = popCandidate();
        const first = candidate.first;
        const second = candidate.second;
        const firstMeta = active.get(first);
        const secondMeta = active.get(second);
        if (
          !firstMeta?.active ||
          !secondMeta?.active ||
          firstMeta.next !== second ||
          firstMeta.version !== candidate.firstVersion ||
          secondMeta.version !== candidate.secondVersion
        )
          continue;
        if (!checkedCanMerge(first, second)) continue;
        // Equivalent at-rule moves preserve depth-first leaf-rule order.
        const oldParent = second.parent;
        const newParent = first.parent;
        const moved = mergeParents(first, second);
        if (moved && oldParent && newParent) {
          repairMove(second, oldParent, newParent);
        }
        if (
          sameDeclarationsAndOrder(
            getMeta(second, ruleMeta).declarations,
            getMeta(first, ruleMeta).declarations
          )
        ) {
          const metaSecond = getMeta(second, ruleMeta);
          metaSecond.selectors = [
            ...getMeta(first, ruleMeta).selectors,
            ...metaSecond.selectors,
          ];
          metaSecond.dirty = true;
          flush(second, ruleMeta);
          detach(first);
          first.remove();
          ruleMeta?.delete(first);
          refresh(second);
          ruleCache?.add(second);
          enqueueNeighbors(second);
          continue;
        }
        if (
          getMeta(first, ruleMeta).selectors.join(',') ===
          getMeta(second, ruleMeta).selectors.join(',')
        ) {
          const cachedDecls = getMeta(first, ruleMeta).declarations;
          second.walk((node) => {
            if (
              node.type === 'decl' &&
              indexOfDeclaration(cachedDecls, node) !== -1
            )
              node.remove();
            else first.append(node);
          });
          getMeta(first, ruleMeta).declarations = getDecls(first);
          detach(second);
          second.remove();
          ruleMeta?.delete(second);
          refresh(first);
          enqueueNeighbors(first);
          continue;
        }
        const replacedRules = [first, second];
        const capturedBoundaries = captureBoundaries(replacedRules);
        const outcome = partialMerge(
          first,
          second,
          browsers,
          compatibilityCache,
          ruleCache,
          ruleMeta,
          (rule, movedFrom, movedTo) => repairMove(rule, movedFrom, movedTo)
        );
        if (outcome.replacements.length) {
          const firstWasBoundary =
            !outcome.moved &&
            outcome.replaced.some((rule) =>
              [...capturedBoundaries.values()].some((b) => b.first === rule)
            );
          const lastWasBoundary =
            !outcome.moved &&
            outcome.replaced.some((rule) =>
              [...capturedBoundaries.values()].some((b) => b.last === rule)
            );
          const previous = active.get(outcome.replaced[0])?.previous ?? null;
          const lastReplaced = /** @type {Rule} */ (outcome.replaced.at(-1));
          const next = active.get(lastReplaced)?.next ?? null;
          const sourceOrder = active.get(outcome.replaced[0])?.sourceOrder;
          for (const rule of outcome.replaced) {
            detach(rule);
            ruleMeta?.delete(rule);
          }
          let prior = previous;
          for (const replacement of outcome.replacements) {
            const meta = refresh(replacement, sourceOrder);
            meta.previous = prior;
            if (prior) {
              /** @type {ActiveMeta} */ (active.get(prior)).next = replacement;
            }
            prior = replacement;
          }
          if (prior) {
            /** @type {ActiveMeta} */ (active.get(prior)).next = next;
          }
          if (next) {
            /** @type {ActiveMeta} */ (active.get(next)).previous = prior;
          }
          if (firstWasBoundary && outcome.replacements[0]?.parent) {
            for (
              let container = getParent(outcome.replacements[0]);
              container;
              container = getParent(container)
            ) {
              const boundary = boundaries.get(container);
              if (boundary) boundary.first = outcome.replacements[0];
            }
          }
          const lastReplacement = /** @type {Rule} */ (
            outcome.replacements.at(-1)
          );
          if (lastWasBoundary && lastReplacement.parent) {
            for (
              let container = getParent(lastReplacement);
              container;
              container = getParent(container)
            ) {
              const boundary = boundaries.get(container);
              if (boundary) boundary.last = lastReplacement;
            }
          }
          if (outcome.moved) {
            // repairMove keeps the current queue safe to drain. Rebuild once
            // afterwards so a cascade of independent moves does not rescan
            // the complete rule list after every boundary change.
            needsGlobalReseed = true;
            for (const replacement of outcome.replacements) {
              enqueueNeighbors(replacement);
            }
            enqueue(previous, outcome.replacements[0] ?? next);
            enqueue(outcome.replacements.at(-1) ?? previous, next);
          } else {
            for (const replacement of outcome.replacements) {
              enqueueNeighbors(replacement);
            }
            enqueue(previous, outcome.replacements[0] ?? next);
            enqueue(outcome.replacements.at(-1) ?? previous, next);
          }
        } else if (moved || outcome.moved) {
          for (const changed of [first, second, ...outcome.changed]) {
            refresh(changed);
            enqueueNeighbors(changed);
          }
          needsGlobalReseed = true;
        }
      }
      root.walkRules((rule) => flush(rule, ruleMeta));
    },
  };
}

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {AutoprefixerOptions & BrowserslistOptions} Options
 */

/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'postcss-merge-rules',

    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(opts, stats, from, file, env);

      const compatibilityCache = new Map();

      // Use WeakSet and WeakMap to avoid memory leaks because the keys are objects.
      const ruleCache = new WeakSet();
      const ruleMeta = new WeakMap();

      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          const merger = selectorMerger(
            browsers,
            compatibilityCache,
            ruleCache,
            ruleMeta
          );
          merger.run(css);
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
