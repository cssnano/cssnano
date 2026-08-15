'use strict';

const getBrowsersList = require('#getBrowsersList');

/** @import browserslist from 'browserslist' */

const { sameParent } = require('cssnano-utils');
const {
  ensureCompatibility,
  sameVendor,
  noVendor,
} = require('./lib/ensureCompatibility');
const { isConflictingProp } = require('./lib/propertyRelations.js');
/** @import {Declaration, Rule} from 'postcss' */
/**
 * @param {Declaration} a
 * @param {Declaration} b
 * @return {boolean}
 */
function declarationIsEqual(a, b) {
  return (
    a.important === b.important && a.prop === b.prop && a.value === b.value
  );
}

/**
 * @param {Declaration[]} array
 * @param {Declaration} decl
 * @return {number}
 */
function indexOfDeclaration(array, decl) {
  return array.findIndex((d) => declarationIsEqual(d, decl));
}

/**
 * Returns filtered array of matched or unmatched declarations
 * @param {Declaration[]} a
 * @param {Declaration[]} b
 * @param {boolean} [not=false]
 * @return {Declaration[]}
 */
function intersect(a, b, not) {
  return a.filter((c) => {
    const index = indexOfDeclaration(b, c) !== -1;
    return not ? !index : index;
  });
}

/**
 * @param {Declaration[]} a
 * @param {Declaration[]} b
 * @return {boolean}
 */
function sameDeclarationsAndOrder(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((d, index) => declarationIsEqual(d, b[index]));
}

/**
 * RuleMeta stores metadata about a `Rule` during the merging process.
 * It tracks selectors and declarations without re-parsing the AST many times.
 *
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
 * @param {import('postcss').ChildNode} node
 * @return {node is Declaration}
 */
function isDeclaration(node) {
  return node.type === 'decl';
}

/**
 * Retrieves or initializes virtual metadata for a PostCSS rule.
 *
 * This metadata caches selectors and declarations to avoid expensive AST
 * re-parsing, especially for the selectors.
 *
 * @param {Rule} rule The PostCSS rule to get metadata for.
 * @param {WeakMap<Rule, RuleMeta>} [ruleMeta] The metadata cache.
 * @return {RuleMeta} The rule's virtual metadata.
 */
function getMeta(rule, ruleMeta) {
  if (ruleMeta && rule) {
    let meta = ruleMeta.get(rule);
    if (!meta && rule.nodes) {
      meta = {
        selectors: rule.selectors,
        declarations: rule.nodes.filter(isDeclaration),
        dirty: false,
      };
      ruleMeta.set(rule, meta);
    }
    return meta ?? { selectors: [], declarations: [], dirty: false };
  }
  return {
    selectors: rule?.selectors ?? [],
    declarations: rule?.nodes?.filter(isDeclaration) ?? [],
    dirty: false,
  };
}

/**
 * Commits virtual metadata changes back to the actual PostCSS rule.
 *
 * @param {Rule} rule The PostCSS rule to flush.
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta The metadata cache.
 */
function flush(rule, ruleMeta) {
  const meta = ruleMeta.get(rule);
  if (meta && meta.dirty) {
    rule.selector = meta.selectors.join(',');
    meta.dirty = false;
  }
}

/**
 * @param {Rule} rule
 * @return {Declaration[]}
 */
function getDecls(rule) {
  return rule.nodes.filter(isDeclaration);
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
 * @return {boolean} merged
 */
function mergeParents(first, second) {
  // Null check for detached rules
  if (!first.parent || !second.parent) {
    return false;
  }

  // Check if parents share node
  if (first.parent === second.parent) {
    return false;
  }

  // sameParent() already called by canMerge()

  second.remove();
  first.parent.append(second);
  return true;
}

/**
 * @param {Rule} second
 * @return {Rule | null}
 */
function getNextRule(second) {
  let nextRule = second.next();
  if (!nextRule) {
    // Grab next cousin
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
 * @param {Rule} first
 * @param {Rule} second
 * @param {Declaration[]} intersection
 * @param {string[]} browsers
 * @param {Map<string, boolean>} compatibilityCache
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {{first: Rule, second: Rule, intersection: Declaration[]}}
 */
function mergeWithNextRule(
  first,
  second,
  intersection,
  browsers,
  compatibilityCache,
  ruleCache,
  ruleMeta
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
    return { first, second, intersection };
  }

  const nextIntersection = intersect(
    getMeta(second, ruleMeta).declarations,
    getMeta(nextRule, ruleMeta).declarations
  );
  if (nextIntersection.length <= intersection.length) {
    return { first, second, intersection };
  }

  mergeParents(second, nextRule);
  return { first: second, second: nextRule, intersection: nextIntersection };
}

/**
 * Returns true if hoisting `candidate` cannot reverse the cascade: every
 * declaration that might override it is itself being
 * hoisted, in the same relative order, so declarations move together.
 *
 * @param {Declaration} candidate
 * @param {number} candidateIndex
 * @param {Declaration[]} hoistCandidates
 * @param {Declaration[]} earlierRuleDeclarations
 * @return {boolean}
 */
function hoistingPreservesOverrideOrder(
  candidate,
  candidateIndex,
  hoistCandidates,
  earlierRuleDeclarations
) {
  const indexInEarlierRule = indexOfDeclaration(
    earlierRuleDeclarations,
    candidate
  );
  const overridesInEarlierRule = earlierRuleDeclarations
    .slice(indexInEarlierRule + 1)
    .filter((d) => isConflictingProp(d.prop, candidate.prop));
  if (overridesInEarlierRule.length === 0) {
    return true;
  }
  const overridesAmongCandidates = hoistCandidates
    .slice(candidateIndex + 1)
    .filter((d) => isConflictingProp(d.prop, candidate.prop));
  if (overridesInEarlierRule.length !== overridesAmongCandidates.length) {
    return false;
  }
  return overridesInEarlierRule.every((d, index) =>
    declarationIsEqual(d, overridesAmongCandidates[index])
  );
}

/**
 * True if the later rule has an unclaimed declaration equal to `candidate`.
 * Records its index in `claimedIndices`, so no other candidate can match the
 * same declaration. Always false when the later rule contains `all`,
 * since `all` resets everything except `direction`/`unicode-bidi`.
 *
 * @param {Declaration} candidate
 * @param {Declaration[]} laterDeclarations
 * @param {Set<number>} claimedIndices
 * @return {boolean}
 */
function claimMatchInLaterRule(candidate, laterDeclarations, claimedIndices) {
  const matchIndex = laterDeclarations.findIndex(
    (d, index) =>
      !claimedIndices.has(index) && isConflictingProp(d.prop, candidate.prop)
  );
  if (matchIndex === -1) {
    return false;
  }
  if (!declarationIsEqual(laterDeclarations[matchIndex], candidate)) {
    return false;
  }
  if (
    candidate.prop.toLowerCase() !== 'direction' &&
    candidate.prop.toLowerCase() !== 'unicode-bidi' &&
    laterDeclarations.some(
      (declaration) => declaration.prop.toLowerCase() === 'all'
    )
  ) {
    return false;
  }
  claimedIndices.add(matchIndex);
  return true;
}

/**
 * Narrows the declarations shared by two adjacent rules down to those that can
 * safely move into a merged rule, along with the indices of the later rule's
 * declarations they claim.
 *
 * The merged rule is emitted after the earlier rule's remaining declarations,
 * so hoisting a declaration that a later declaration in the earlier rule
 * overrides would reverse the cascade and make the previously dead value
 * effective again, unless that overriding declaration is hoisted too, so both
 * move together and keep their relative order.
 *
 * Dropping a candidate can invalidate one that was only admitted because it
 * travelled with it, so the pass repeats until the surviving set stops
 * shrinking.
 *
 * @param {Declaration[]} hoistCandidates
 * @param {Declaration[]} earlierRuleDeclarations
 * @param {Declaration[]} laterRuleDeclarations
 * @return {{intersection: Declaration[], claimedIndices: Set<number>}}
 */
function filterRuleIntersections(
  hoistCandidates,
  earlierRuleDeclarations,
  laterRuleDeclarations
) {
  let remainingCandidates = hoistCandidates;
  for (;;) {
    // A candidate rejected by the override check never claims a match.
    const claimedIndices = new Set();
    const survivors = remainingCandidates.filter(
      (candidate, candidateIndex) =>
        hoistingPreservesOverrideOrder(
          candidate,
          candidateIndex,
          remainingCandidates,
          earlierRuleDeclarations
        ) &&
        claimMatchInLaterRule(candidate, laterRuleDeclarations, claimedIndices)
    );
    if (
      survivors.length === remainingCandidates.length ||
      survivors.length === 0
    ) {
      return { intersection: survivors, claimedIndices };
    }
    remainingCandidates = survivors;
  }
}

/**
 * @param {Rule} first
 * @param {Rule} second
 * @param {Declaration[]} intersection
 * @param {Set<number>} claimedIndices Positions of the declarations the
 * intersection claimed in `second`, which the merged rule replaces.
 * @param {WeakSet<Rule>} ruleCache
 * @param {WeakMap<Rule, RuleMeta>} ruleMeta
 * @return {Rule}
 */
function buildMergedRule(
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

  /**
   * @param {(decl: Declaration) => void} callback
   * @this void
   * @return {(decl: Declaration) => void}
   */
  function moveDecl(callback) {
    return (decl) => {
      if (indexOfDeclaration(intersection, decl) !== -1) {
        callback.call(this, decl);
      }
    };
  }
  firstClone.walkDecls(
    moveDecl(
      /**
       * @param {Declaration} decl
       */
      (decl) => {
        decl.remove();
        receivingBlock.append(decl);
      }
    )
  );
  // Remove exactly the declarations that were claimed: matching by value would
  // also delete a duplicate that re-asserts the value later in the rule, after
  // an overriding declaration that stays behind.
  let laterIndex = 0;
  secondClone.walkDecls((decl) => {
    if (claimedIndices.has(laterIndex++)) {
      decl.remove();
    }
  });

  // Ensure original rules are flushed for accurate length comparison
  if (ruleMeta) {
    flush(first, ruleMeta);
    flush(second, ruleMeta);
  }

  const merged = ruleLength(firstClone, receivingBlock, secondClone);
  const original = ruleLength(first, second);
  if (merged < original) {
    first.replaceWith(firstClone);
    second.replaceWith(secondClone);
    for (const r of [firstClone, receivingBlock, secondClone]) {
      if (r.nodes.length === 0) {
        r.remove();
      }
    }
    if (!secondClone.parent) {
      ruleCache?.add(receivingBlock);
      return receivingBlock;
    }
    ruleCache?.add(receivingBlock);
    ruleCache?.add(secondClone);
    ruleMeta?.delete(first);
    ruleMeta?.delete(second);
    return secondClone;
  }

  receivingBlock.remove();
  return second;
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
    ruleMeta
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

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<Options>} */ (
  pluginCreator
);
