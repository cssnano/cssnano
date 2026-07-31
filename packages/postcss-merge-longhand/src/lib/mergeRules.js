'use strict';
const hasAllProps = require('./hasAllProps.js');
const getDeclarationsThatMatchProperties = require('./getDecls.js');
const getRules = require('./getRules.js');

/**
 * @param {import('postcss').Declaration} declA
 * @param {import('postcss').Declaration} declB
 * @return {boolean}
 */
function arePropertiesConflicting(declA, declB) {
  if (!declB.prop || declB.important !== declA.important) {
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
  const between = nodes
    .slice(firstNodeIndex + 1, lastNodeIndex)
    .filter((node) => !match.includes(node));

  return match.some((a) =>
    between.some(
      (b) =>
        arePropertiesConflicting(a, b) &&
        (a.prop !== b.prop || nodes.indexOf(b) > nodes.indexOf(a))
    )
  );
}

/**
 * @param {import('postcss').Rule} rule
 * @param {string[]} properties
 * @param {(rules: import('postcss').Declaration[], last: import('postcss').Declaration, props: import('postcss').Declaration[]) => boolean} callback
 * @return {void}
 */
module.exports = function mergeRules(rule, properties, callback) {
  let declarations = getDeclarationsThatMatchProperties(
    rule,
    new Set(properties)
  );

  while (declarations.length) {
    const last = declarations[declarations.length - 1];
    const props = declarations.filter(
      (node) => node.important === last.important
    );
    const rules = getRules(props, properties);

    if (
      hasAllProps(rules, ...properties) &&
      !hasConflicts(
        rules,
        /** @type import('postcss').Declaration[]*/ (rule.nodes)
      )
    ) {
      if (callback(rules, last, props)) {
        declarations = declarations.filter((node) => !rules.includes(node));
      }
    }

    declarations = declarations.filter((node) => node !== last);
  }
};
