'use strict';
const { isFallback } = require('./isFallback.js');
const { isAuthoredValue } = require('./authoredValues.js');

/**
 * @param {import('postcss').Declaration} declaration
 * @param {Iterable<import('postcss').Declaration>} candidates in document order
 * @return {[boolean, boolean]} whether an earlier declaration for the same
 * property exists, and whether declaration is an enhancement over one
 */
function precedingDeclarations(declaration, candidates) {
  let preceded = false;

  for (const node of candidates) {
    if (node === declaration) {
      break;
    }

    if (node.prop.toLowerCase() === declaration.prop.toLowerCase()) {
      preceded = true;

      if (isAuthoredValue(node) && isFallback(node, declaration)) {
        return [true, true];
      }
    }
  }

  return [preceded, false];
}

/**
 * Only browsers that can parse a shorthand in full apply any of it, so folding
 * a declaration that overrides a fallback strands that fallback: browsers that
 * keep it read the shorthand instead and lose every other property in it.
 *
 * When each declaration is itself preceded by one for the same property, the
 * layer left behind is complete and merges into its own, earlier shorthand, so
 * the merge is safe. The mixed case is the one to abandon.
 *
 * @param {import('postcss').Declaration[]} rules
 * @param {Iterable<import('postcss').Declaration>} candidates in document order
 * @return {boolean}
 */
module.exports = (rules, candidates) => {
  let overridesFallback = false;
  let everyOneIsPreceded = true;

  for (const declaration of rules) {
    const [preceded, overriding] = precedingDeclarations(
      declaration,
      candidates
    );

    overridesFallback ||= overriding;
    everyOneIsPreceded &&= preceded;
  }

  return overridesFallback && !everyOneIsPreceded;
};
