import browserslist from 'browserslist';
import postcss from 'postcss';
import sameParent from 'lerna:cssnano-util-same-parent';
import * as R from 'ramda';
import ensureCompatibility from './lib/ensureCompatibility';
import filterPrefixes from './lib/filterPrefixes';
import sameVendor from './lib/sameVendor';

/**
 * @param {postcss.Rule} rule
 * @return {postcss.Declaration[]}
 */
const getDecls = R.compose(
  R.filter(R.propEq('type', 'decl')),
  R.prop('nodes')
);

/**
 * @param {postcss.Declaration} a
 * @param {postcss.Declaration} b
 * @return {boolean}
 */
const declarationIsEqual = R.allPass([
  R.eqProps('important'),
  R.eqProps('prop'),
  R.eqProps('value'),
]);

/**
 * @param {postcss.Declaration[]} array
 * @param {postcss.Declaration} decl
 * @return {number}
 */
const indexOfDeclaration = (array, decl) =>
  array.findIndex(declarationIsEqual(decl));

/**
 * Returns filtered array of matched or unmatched declarations
 * @param {postcss.Declaration[]} a
 * @param {postcss.Declaration[]} b
 * @return {postcss.Declaration[]}
 */
function intersect(a, b) {
  return a.filter((c) => ~indexOfDeclaration(b, c));
}

/**
 * @param {postcss.Declaration[]} a
 * @param {postcss.Declaration[]} b
 * @return {boolean}
 */
const sameDeclarationsAndOrder = R.both(R.eqProps('length'), (a, b) =>
  a.every((d, index) => declarationIsEqual(d, b[index]))
);

/**
 * @param {string} selector
 * @return {boolean}
 */
const noVendor = R.compose(
  R.complement(R.length),
  filterPrefixes
);

/**
 * @param {postcss.Rule} ruleA
 * @param {postcss.Rule} ruleB
 * @param {string[]=} browsers
 * @param {Object.<string, boolean>=} compatibilityCache
 * @return {boolean}
 */
function canMerge(ruleA, ruleB, browsers, compatibilityCache) {
  const a = ruleA.selectors;
  const b = ruleB.selectors;

  const selectors = a.concat(b);

  if (!ensureCompatibility(selectors, browsers, compatibilityCache)) {
    return false;
  }

  const parent = sameParent(ruleA, ruleB);
  const { name } = ruleA.parent;
  if (parent && name && ~name.indexOf('keyframes')) {
    return false;
  }
  return parent && (selectors.every(noVendor) || sameVendor(a, b));
}

const joinSelectors = R.compose(
  R.join(','),
  R.pluck('selector')
);

const ruleLength = R.compose(
  R.length,
  R.join(''),
  R.map(R.ifElse(R.path(['nodes', 'length']), String, () => ''))
);

/**
 * @param {string} prop
 * @return {{prefix: string, base:string, rest:string[]}}
 */
function splitProp(prop) {
  // Treat vendor prefixed properties as if they were unprefixed;
  // moving them when combined with non-prefixed properties can
  // cause issues. e.g. moving -webkit-background-clip when there
  // is a background shorthand definition.

  const parts = prop.split('-');
  if (prop[0] !== '-') {
    return {
      prefix: '',
      base: parts[0],
      rest: parts.slice(1),
    };
  }
  // Don't split css variables
  if (prop[1] === '-') {
    return {
      prefix: null,
      base: null,
      rest: [prop],
    };
  }
  // Found prefix
  return {
    prefix: parts[1],
    base: parts[2],
    rest: parts.slice(3),
  };
}

const getProp = R.prop('prop');

/**
 * @param {postcss.Decl} declA
 * @param {postcss.Decl} declB
 */
const isConflictingProp = R.curry((declA, declB) => {
  const propA = getProp(declA);
  const propB = getProp(declB);

  if (propA === propB) {
    // Same specificity
    return true;
  }
  const a = splitProp(propA);
  const b = splitProp(propB);
  // Don't resort css variables
  if (!a.base && !b.base) {
    return true;
  }
  // Different base;
  if (a.base !== b.base) {
    return false;
  }
  // Conflict if rest-count mismatches
  if (a.rest.length !== b.rest.length) {
    return true;
  }

  // Conflict if rest parameters are equal (same but unprefixed)
  return a.rest.every((s, index) => b.rest[index] === s);
});

/**
 * @param {postcss.Rule} first
 * @param {postcss.Rule} second
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
 * @param {postcss.Rule} first
 * @param {postcss.Rule} second
 * @return {postcss.Rule} mergedRule
 */
function partialMerge(first, second) {
  let intersection = intersect(getDecls(first), getDecls(second));
  if (!intersection.length) {
    return second;
  }

  const nextRule = second.next() || R.path(['nodes', 0], second.parent.next());

  if (nextRule && nextRule.type === 'rule' && canMerge(second, nextRule)) {
    let nextIntersection = intersect(getDecls(second), getDecls(nextRule));
    if (nextIntersection.length > intersection.length) {
      mergeParents(second, nextRule);
      first = second;
      second = nextRule;
      intersection = nextIntersection;
    }
  }

  const firstDecls = getDecls(first);

  // Filter out intersections with later conflicts in First
  intersection = intersection.filter((decl, intersectIndex) => {
    const index = indexOfDeclaration(firstDecls, decl);
    const nextConflictInFirst = firstDecls
      .slice(index + 1)
      .find(isConflictingProp(decl));
    if (!nextConflictInFirst) {
      return true;
    }
    const nextConflictInIntersection = intersection
      .slice(intersectIndex + 1)
      .find(isConflictingProp(decl));
    if (!nextConflictInIntersection) {
      return false;
    }
    if (declarationIsEqual(nextConflictInFirst, nextConflictInIntersection)) {
      return true;
    }
    return false;
  });

  // Filter out intersections with previous conflicts in Second
  const secondDecls = getDecls(second);
  intersection = intersection.filter((decl) => {
    const nextConflictIndex = secondDecls.findIndex(isConflictingProp(decl));
    if (nextConflictIndex === -1) {
      return false;
    }
    if (!declarationIsEqual(secondDecls[nextConflictIndex], decl)) {
      return false;
    }
    secondDecls.splice(nextConflictIndex, 1);
    return true;
  });

  if (!intersection.length) {
    // Nothing to merge
    return second;
  }

  const receivingBlock = second.clone();
  receivingBlock.selector = joinSelectors([first, second]);
  receivingBlock.nodes = [];

  // Rules with "all" declarations must be on top
  if (
    intersection.some((declaration) => declaration.prop.toLowerCase() === 'all')
  ) {
    second.parent.insertBefore(first, receivingBlock);
  } else {
    second.parent.insertBefore(second, receivingBlock);
  }

  const firstClone = first.clone();
  const secondClone = second.clone();

  /**
   * @param {function(postcss.Declaration):void} callback
   * @return {function(postcss.Declaration)}
   */
  function moveDecl(callback) {
    return (decl) => {
      if (~indexOfDeclaration(intersection, decl)) {
        callback.call(this, decl);
      }
    };
  }
  firstClone.walkDecls(
    moveDecl((decl) => {
      decl.remove();
      receivingBlock.append(decl);
    })
  );
  secondClone.walkDecls(moveDecl((decl) => decl.remove()));
  const merged = ruleLength([firstClone, receivingBlock, secondClone]);
  const original = ruleLength([first, second]);
  if (merged < original) {
    first.replaceWith(firstClone);
    second.replaceWith(secondClone);
    [firstClone, receivingBlock, secondClone].forEach((r) => {
      if (!r.nodes.length) {
        r.remove();
      }
    });
    if (!secondClone.parent) {
      return receivingBlock;
    }
    return secondClone;
  } else {
    receivingBlock.remove();
    return second;
  }
}

/**
 * @param {string[]} browsers
 * @param {Object.<string, boolean>} compatibilityCache
 * @return {function(postcss.Rule)}
 */
function selectorMerger(browsers, compatibilityCache) {
  /** @type {postcss.Rule} */
  let cache = null;
  return function(rule) {
    // Prime the cache with the first rule, or alternately ensure that it is
    // safe to merge both declarations before continuing
    if (!cache || !canMerge(rule, cache, browsers, compatibilityCache)) {
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
    if (sameDeclarationsAndOrder(getDecls(rule), getDecls(cache))) {
      rule.selector = joinSelectors([cache, rule]);
      cache.remove();
      cache = rule;
      return;
    }
    // Merge when both selectors are exactly equal
    // e.g. a { color: blue } a { font-weight: bold }
    if (cache.selector === rule.selector) {
      const cached = getDecls(cache);
      rule.walk((decl) => {
        if (~indexOfDeclaration(cached, decl)) {
          return decl.remove();
        }
        cache.append(decl);
      });
      rule.remove();
      return;
    }
    // Partial merge: check if the rule contains a subset of the last; if
    // so create a joined selector with the subset, if smaller.
    cache = partialMerge(cache, rule);
  };
}

export default postcss.plugin('postcss-merge-rules', () => {
  return (css, result) => {
    const resultOpts = result.opts || {};
    const browsers = browserslist(null, {
      stats: resultOpts.stats,
      path: __dirname,
      env: resultOpts.env,
    });
    const compatibilityCache = {};
    css.walkRules(selectorMerger(browsers, compatibilityCache));
  };
});
