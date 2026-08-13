'use strict';
const hasAllProps = require('./hasAllProps.js');
const getDeclarationsThatMatchProperties = require('./getDecls.js');
const getRules = require('./getRules.js');
const skipsFallback = require('./skipsFallback.js');
const lastOf = require('./lastOf.js');

/**
 * @param {import('postcss').Declaration} declA
 * @param {import('postcss').Declaration} declB
 * @return {boolean}
 */
function arePropertiesConflicting(declA, declB) {
  if (!declA.prop || !declB.prop || declB.important !== declA.important) {
    return false;
  }

  const partsA = declA.prop.split('-');
  const partsB = declB.prop.split('-');

  /* Be safe: check that the first part matches. So we don't try to
   * combine e.g. border-color and color.
   */
  if (partsA[0] !== partsB[0]) {
    return false;
  }

  const partsASet = new Set(partsA);
  const partsBSet = new Set(partsB);
  return partsBSet.isSubsetOf(partsASet);
}

/**
 * @param {import('postcss').Declaration[]} match
 * @param {import('postcss').Declaration[]} nodes
 * @return {boolean}
 */
function hasConflicts(match, nodes) {
  /** @type {number[]} */
  const nodeIndices = match.map((n) => nodes.indexOf(n));
  const firstNodeIndex = Math.min(...nodeIndices);
  const lastNodeIndex = Math.max(...nodeIndices);
  const matchSet = new Set(match);
  const between = nodes
    .slice(firstNodeIndex + 1, lastNodeIndex)
    .filter((node) => !matchSet.has(node));

  return match.some((a) =>
    between.some((b) => {
      /* Merging moves a to the end of the range, so anything in between that
       * used to override it stops doing so.
       */
      const overridesA = nodes.indexOf(b) > nodes.indexOf(a);

      if (arePropertiesConflicting(a, b)) {
        return a.prop !== b.prop || overridesA;
      }

      /* b names part of a, such as border-left-width against border-left, and
       * only wins where it comes later.
       */
      return overridesA && a.prop !== b.prop && arePropertiesConflicting(b, a);
    })
  );
}

/**
 * @param {import('postcss').Rule} rule
 * @param {string[]} properties
 * @param {(rules: import('postcss').Declaration[], last: import('postcss').Declaration, props: Set<import('postcss').Declaration>) => boolean} callback
 * @return {void}
 */
module.exports = function mergeRules(rule, properties, callback) {
  const declarations = getDeclarationsThatMatchProperties(
    rule,
    new Set(properties)
  );

  while (declarations.size) {
    const last = lastOf(declarations);
    /** @type {Set<import('postcss').Declaration>} */
    const props = new Set();

    for (const node of declarations) {
      if (node.important === last.important) {
        props.add(node);
      }
    }

    const rules = getRules(props, properties);

    if (
      hasAllProps(rules, ...properties) &&
      !hasConflicts(
        rules,
        /** @type import('postcss').Declaration[]*/ (rule.nodes)
      ) &&
      !skipsFallback(rules, props)
    ) {
      if (callback(rules, last, props)) {
        for (const node of rules) {
          declarations.delete(node);
        }
      }
    }

    declarations.delete(last);
  }
};
