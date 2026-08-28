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

/** @param {{benefit: number, position: number, key: string}} a @param {{benefit: number, position: number, key: string}} b */
function compareCandidates(a, b) {
  if (a.position !== b.position) return b.position - a.position;
  if (a.benefit !== b.benefit) return a.benefit - b.benefit;
  if (a.key < b.key) return 1;
  if (a.key > b.key) return -1;
  return 0;
}
/**
 * @param {Rule} first
 * @param {Rule} second
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {{rule: Rule, replacements: Rule[], replaced: Rule[], changed: Rule[], moved: boolean}}
 */
function partialMerge(
  first,
  second,
  browsers,
  compatibilityCache,
  ruleCache,
  ruleMeta
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
    canMerge
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
  const stats = {
    eligiblePairs: 0,
    filteredPairs: 0,
    candidatePops: 0,
    staleRejections: 0,
    heapPeak: 0,
    successfulRewrites: 0,
    compatibilityChecks: 0,
    localRepairs: 0,
  };
  /** @typedef {RuleMeta & {id: number, selectorKey: string, declarationIds: number[], declarationIdSet: Set<number>, declarationLengths: number[], revision: number, previous: Rule | null, next: Rule | null, active: boolean}} ActiveMeta */
  /** @type {WeakMap<Rule, ActiveMeta>} */
  const active = new WeakMap();
  /** @type {{first: Rule, second: Rule, firstRevision: number, secondRevision: number, benefit: number, position: number, key: string}[]} */
  const heap = [];
  /** @type {Map<string, number>} */
  const declarationIds = new Map();
  let nextId = 0;
  let nextDeclarationId = 0;

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

  function refresh(rule) {
    const previous = active.get(rule);
    const base = getMeta(rule, ruleMeta);
    const ids = base.declarations.map(getDeclarationId);
    /** @type {ActiveMeta} */
    const meta = Object.assign(base, {
      id: previous?.id ?? nextId++,
      selectorKey: base.selectors.join(','),
      declarationIds: ids,
      declarationIdSet: new Set(ids),
      declarationLengths: base.declarations.map(
        (declaration) => String(declaration).length
      ),
      revision: (previous?.revision ?? 0) + 1,
      previous: previous?.previous ?? null,
      next: previous?.next ?? null,
      active: true,
    });
    active.set(rule, meta);
    return meta;
  }
  function push(candidate, key) {
    heap.push(candidate);
    candidate.key = key();
    for (let index = heap.length - 1; index > 0;) {
      const parent = Math.floor((index - 1) / 2);
      if (compareCandidates(heap[index], heap[parent]) <= 0) break;
      [heap[index], heap[parent]] = [heap[parent], heap[index]];
      index = parent;
    }
    stats.heapPeak = Math.max(stats.heapPeak, heap.length);
  }
  function pop() {
    const first = heap[0];
    const last = heap.pop();
    if (heap.length && last) {
      heap[0] = last;
      for (let index = 0; ;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let largest = index;
        if (
          left < heap.length &&
          compareCandidates(heap[left], heap[largest]) > 0
        )
          largest = left;
        if (
          right < heap.length &&
          compareCandidates(heap[right], heap[largest]) > 0
        )
          largest = right;
        if (largest === index) break;
        [heap[index], heap[largest]] = [heap[largest], heap[index]];
        index = largest;
      }
    }
    return first;
  }
  function enqueue(first, second) {
    if (!first || !second) return;
    const a = active.get(first);
    const b = active.get(second);
    if (!a?.active || !b?.active || a.next !== second) return;
    let benefit = 0;
    for (const [index, id] of a.declarationIds.entries()) {
      if (b.declarationIdSet.has(id)) benefit += a.declarationLengths[index];
    }
    // Empty rules and equivalent at-rule boundaries retain the legacy
    // structural rewrites even though they cannot share a declaration.
    const structuralRewrite =
      (a.declarations.length === 0 && b.declarations.length === 0) ||
      (first.parent !== second.parent && sameParent(first, second));
    if (
      a.selectorKey !== b.selectorKey &&
      benefit === 0 &&
      !structuralRewrite
    ) {
      stats.filteredPairs++;
      return;
    }
    stats.eligiblePairs++;
    push(
      {
        first,
        second,
        firstRevision: a.revision,
        secondRevision: b.revision,
        benefit,
        position: a.id,
        key: '',
      },
      () =>
        `${a.selectorKey}|${a.declarations.map(String).join(';')}\u0000${b.selectorKey}|${b.declarations.map(String).join(';')}`
    );
  }
  function detach(rule) {
    const meta = active.get(rule);
    if (!meta?.active) return;
    const { previous, next } = meta;
    if (previous) active.get(previous).next = next;
    if (next) active.get(next).previous = previous;
    meta.active = false;
    meta.revision++;
  }
  function seed(root) {
    /** @type {Rule | null} */ let previous = null;
    root.walkRules((rule) => {
      const meta = refresh(rule);
      meta.previous = previous;
      meta.next = null;
      if (previous) {
        active.get(previous).next = rule;
        enqueue(previous, rule);
      }
      previous = rule;
    });
    if (previous) active.get(previous).next = null;
  }
  function local(...rules) {
    stats.localRepairs++;
    for (const rule of rules) {
      const meta = active.get(rule);
      if (meta?.active) {
        enqueue(meta.previous, rule);
        enqueue(rule, meta.next);
      }
    }
  }
  return {
    // The rewrite cases are kept together so the candidate validity check is
    // immediately adjacent to every AST mutation.
    // eslint-disable-next-line complexity
    run(root) {
      seed(root);
      const checkedCanMerge = (first, second) => {
        stats.compatibilityChecks++;
        return canMerge(
          first,
          second,
          browsers,
          compatibilityCache,
          ruleCache,
          ruleMeta
        );
      };
      while (heap.length) {
        const candidate = pop();
        stats.candidatePops++;
        const firstMeta = active.get(candidate.first);
        const secondMeta = active.get(candidate.second);
        if (
          !firstMeta?.active ||
          !secondMeta?.active ||
          firstMeta.next !== candidate.second ||
          candidate.firstRevision !== firstMeta.revision ||
          candidate.secondRevision !== secondMeta.revision
        ) {
          stats.staleRejections++;
          continue;
        }
        if (!checkedCanMerge(candidate.first, candidate.second)) continue;
        const first = candidate.first;
        const second = candidate.second;
        // Equivalent at-rule moves preserve depth-first leaf-rule order.
        const moved = mergeParents(first, second);
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
          local(second, first);
          stats.successfulRewrites++;
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
          local(first, second);
          stats.successfulRewrites++;
          continue;
        }
        const outcome = partialMerge(
          first,
          second,
          browsers,
          compatibilityCache,
          ruleCache,
          ruleMeta
        );
        if (outcome.replacements.length) {
          const previous = active.get(outcome.replaced[0])?.previous ?? null;
          const next = active.get(outcome.replaced.at(-1))?.next ?? null;
          for (const rule of outcome.replaced) {
            detach(rule);
            ruleMeta?.delete(rule);
          }
          let prior = previous;
          for (const replacement of outcome.replacements) {
            const meta = refresh(replacement);
            meta.previous = prior;
            if (prior) active.get(prior).next = replacement;
            prior = replacement;
          }
          if (prior) active.get(prior).next = next;
          if (next) active.get(next).previous = prior;
          local(...outcome.replacements, previous, next, first);
          stats.successfulRewrites++;
        } else if (moved || outcome.moved) {
          refresh(first);
          refresh(second);
          for (const changed of outcome.changed) refresh(changed);
          local(first, second, ...outcome.changed);
        }
      }
      root.walkRules((rule) => flush(rule, ruleMeta));
      if (process.env.CSSNANO_MERGE_RULES_STATS)
        process.stderr.write(`postcss-merge-rules ${JSON.stringify(stats)}\n`);
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
