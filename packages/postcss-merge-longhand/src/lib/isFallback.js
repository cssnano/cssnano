'use strict';
const valueParser = require('postcss-value-parser');
const { colorFunctions } = require('./spec.js');

/* Substitute a value for something else, so a browser that does not know the
 * function cannot parse the declaration around it at all. */
const substitutionFunctions = ['var', 'env', 'constant'];

/* Colours have been written this way for as long as CSS has had them, so a
 * value reaching for one of these asks for no support the earlier value
 * lacked. Every other colour function arrived later. */
const originalColorFunctions = new Set(['rgb', 'hsl']);

/* The colour notations CSS Color 3 gave the web, alpha spellings included. */
const colorLevel3Functions = new Set(['rgb', 'rgba', 'hsl', 'hsla']);

/**
 * The functions whose support decides whether a browser keeps a declaration or
 * throws it away, and so the ones an author writes a fallback for.
 */
const supportGates = new Set([
  ...substitutionFunctions,
  ...colorFunctions.difference(originalColorFunctions),
]);

/**
 * The gates a merge steps back for, which is fewer.
 *
 * Declaring one property twice, the later value calling a function the earlier
 * does not, is an author writing a fallback whatever that function's age: the
 * repetition is the evidence, and reading it costs the stylesheet nothing.
 * Folding separate properties into a shorthand has no such evidence to go on,
 * and refusing wherever a value mentions `rgba()` would refuse most of the
 * web, so a merge only weighs the functions a page written today would still
 * be given a fallback for.
 */
const mergeGates = supportGates.difference(colorLevel3Functions);

/**
 * @param {string} value
 * @return {Set<string>} the support gates the value calls
 */
function gatesIn(value) {
  /** @type {Set<string>} */
  const names = new Set();

  valueParser(value).walk((node) => {
    if (node.type !== 'function') {
      return;
    }

    const name = node.value.toLowerCase();

    if (supportGates.has(name)) {
      names.add(name);
    }
  });

  return names;
}

/**
 * A value says which gates the browsers that applied a declaration understood,
 * but not always all of them: a longhand the plugin exploded out of
 * `padding: env(x) 3px 1px` only ever applied where `env()` parsed, though its
 * own value is a plain `3px`. Recording the gates as declarations are cloned
 * keeps that provenance, which comparing values after the fact cannot recover.
 *
 * @type {WeakMap<import('postcss').Declaration, Set<string>>}
 */
const inheritedGates = new WeakMap();

/**
 * @param {import('postcss').Declaration} declaration
 * @return {Set<string>} every gate a browser had to understand for the
 * declaration to apply: the ones its value calls, and the ones the declaration
 * it was cloned from needed
 */
function requiredGates(declaration) {
  const own = gatesIn(declaration.value);
  const inherited = inheritedGates.get(declaration);

  return inherited === undefined ? own : own.union(inherited);
}

/**
 * @param {import('postcss').Declaration} source
 * @param {import('postcss').Declaration} clone taken from source
 * @return {void}
 */
function inheritGates(source, clone) {
  inheritedGates.set(clone, requiredGates(source));
}

/**
 * The map answers this too: nothing records a declaration the author wrote,
 * only one the plugin made out of another. A value the plugin invented, such
 * as the `currentcolor` standing for the colour `border: medium none` never
 * named, cannot be a fallback anybody wrote.
 *
 * @param {import('postcss').Declaration} declaration
 * @return {boolean} whether the plugin created the declaration
 */
function isDerived(declaration) {
  return inheritedGates.has(declaration);
}

/**
 * @param {import('postcss').Declaration} declaration
 * @return {Set<string>} the gates out of `requiredGates` that stop a merge
 */
function mergeBlockingGates(declaration) {
  return requiredGates(declaration).intersection(mergeGates);
}

/**
 * Authors write a fallback by declaring a property twice, where the later
 * value uses syntax older browsers cannot parse; those browsers drop the
 * later declaration and keep the earlier one. Discarding the earlier
 * declaration, or folding it into a shorthand, therefore changes rendering.
 *
 * A later declaration that needs a support gate the earlier one does not is
 * assumed to be such an enhancement.
 *
 * @param {import('postcss').Declaration} earlier
 * @param {import('postcss').Declaration} later
 * @return {boolean} whether earlier is a fallback for later
 */
function isFallback(earlier, later) {
  return !requiredGates(later).isSubsetOf(requiredGates(earlier));
}

module.exports = {
  requiredGates,
  mergeBlockingGates,
  inheritGates,
  isDerived,
  isFallback,
};
