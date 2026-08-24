import hasAllProps from './hasAllProps.js';
import getDeclarationsThatMatchProperties from './getDecls.js';
import getRules from './getRules.js';
import skipsFallback from './skipsFallback.js';
import lastOf from './lastOf.js';
import { setsLonghands } from './spec.js';

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
 * Whether two properties set any of the same longhands without either name
 * containing the other — `border-top` fixes the side and leaves the component
 * open, `border-color` does the opposite, and the two meet at
 * `border-top-color` with neither name mentioning the other.
 *
 * `arePropertiesConflicting` cannot see these: it compares the name segments,
 * and neither name is a subset of the other. Merging still moves one past the
 * other, so the pair has to be weighed the same way as a property the merged
 * one plainly contains.
 *
 * @param {import('postcss').Declaration} declA
 * @param {import('postcss').Declaration} declB
 * @return {boolean}
 */
function arePropertiesCrossing(declA, declB) {
  /* `between` carries whatever sits in the rule, comments included, and a
   * comment has no property to compare. */
  if (!declA.prop || !declB.prop) {
    return false;
  }

  const setsA = setsLonghands(declA.prop.toLowerCase());
  const setsB = setsLonghands(declB.prop.toLowerCase());

  return !setsA.isDisjointFrom(setsB);
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
      if (overridesA && a.prop !== b.prop && arePropertiesConflicting(b, a)) {
        return true;
      }

      /* Neither name contains the other, yet the two reach some of the same
       * longhands. Only the ones b currently overrides matter: a repeat that
       * already came before a still comes before whatever replaces it.
       */
      return overridesA && arePropertiesCrossing(a, b);
    })
  );
}

/**
 * @param {import('postcss').Rule} rule
 * @param {string[]} properties
 * @param {(rules: import('postcss').Declaration[], last: import('postcss').Declaration, props: Set<import('postcss').Declaration>) => boolean} callback
 * @return {void}
 */
function mergeRules(rule, properties, callback) {
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
      !skipsFallback(rules)
    ) {
      if (callback(rules, last, props)) {
        for (const node of rules) {
          declarations.delete(node);
        }
      }
    }

    declarations.delete(last);
  }
}

export default mergeRules;
