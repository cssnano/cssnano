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
 * @param {Rule} first
 * @param {Rule} second
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {Rule} mergedRule
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
    return second;
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
    return mergedSecond;
  }

  return buildMergedRule(
    mergedFirst,
    mergedSecond,
    intersection,
    filtered.claimedIndices,
    ruleCache,
    ruleMeta
  );
}

/**
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {{ merger: (rule: Rule) => void, clean: () => void }}
 */
function selectorMerger(browsers, compatibilityCache, ruleCache, ruleMeta) {
  /** @type {Rule | null} */
  let cache = null;
  return {
    merger(rule) {
      // Prime the cache with the first rule, or alternately ensure that it is
      // safe to merge both declarations before continuing
      if (
        !cache ||
        !canMerge(
          rule,
          cache,
          browsers,
          compatibilityCache,
          ruleCache,
          ruleMeta
        )
      ) {
        if (cache) {
          flush(cache, ruleMeta);
        }
        cache = rule;
        return;
      }
      // Ensure that we don't deduplicate the same rule; this is sometimes
      // caused by a partial merge
      if (cache === rule) {
        cache = rule;
        return;
      }

      // Parents merge: check if the rules have same parents, but not same parent nodes
      mergeParents(cache, rule);

      // Merge when declarations are exactly equal
      // e.g. h1 { color: red } h2 { color: red }
      if (
        sameDeclarationsAndOrder(
          getMeta(rule, ruleMeta).declarations,
          getMeta(cache, ruleMeta).declarations
        )
      ) {
        const metaRule = getMeta(rule, ruleMeta);
        const metaCache = getMeta(cache, ruleMeta);
        metaRule.selectors = [...metaCache.selectors, ...metaRule.selectors];
        metaRule.dirty = true;
        cache.remove();
        ruleMeta?.delete(cache);
        cache = rule;
        ruleCache?.add(rule);
        return;
      }
      // Merge when both selectors are exactly equal
      // e.g. a { color: blue } a { font-weight: bold }
      if (
        getMeta(cache, ruleMeta).selectors.join(',') ===
        getMeta(rule, ruleMeta).selectors.join(',')
      ) {
        const cachedDecls = getMeta(cache, ruleMeta).declarations;
        rule.walk((node) => {
          if (
            node.type === 'decl' &&
            indexOfDeclaration(cachedDecls, node) !== -1
          ) {
            node.remove();
            return;
          }
          /** @type {Rule} */ (cache).append(node);
        });
        getMeta(cache, ruleMeta).declarations = getDecls(cache);
        rule.remove();
        ruleMeta?.delete(rule);
        return;
      }
      // Partial merge: check if the rule contains a subset of the last; if
      // so create a joined selector with the subset, if smaller.
      cache = partialMerge(
        cache,
        rule,
        browsers,
        compatibilityCache,
        ruleCache,
        ruleMeta
      );
    },
    // Flushes any remaining rule in the cache to avoid memory leaks.
    clean() {
      if (cache) {
        flush(cache, ruleMeta);
      }
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
          const { merger, clean } = selectorMerger(
            browsers,
            compatibilityCache,
            ruleCache,
            ruleMeta
          );
          css.walkRules(merger);
          clean();
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
