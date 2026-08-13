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

/**
 * The functions whose support decides whether a browser keeps a declaration or
 * throws it away, and so the ones an author writes a fallback for.
 */
const supportGates = new Set([
  ...substitutionFunctions,
  ...colorFunctions.difference(originalColorFunctions),
]);

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
 * Authors write a fallback by declaring a property twice, where the later
 * value uses syntax older browsers cannot parse; those browsers drop the
 * later declaration and keep the earlier one. Discarding the earlier
 * declaration, or folding it into a shorthand, therefore changes rendering.
 *
 * A later value that reaches for a support gate the earlier one does not use is
 * assumed to be such an enhancement.
 *
 * @param {import('postcss').Declaration} earlier
 * @param {import('postcss').Declaration} later
 * @return {boolean} whether earlier is a fallback for later
 */
function isFallback(earlier, later) {
  return !gatesIn(later.value).isSubsetOf(gatesIn(earlier.value));
}

/**
 * Whether any of the declarations could be a fallback for one that follows it,
 * which is what the transforms have to work around. Reading each value once is
 * enough: no declaration is an enhancement over the ones before it as long as
 * every one of them already calls the gates it does.
 *
 * @param {import('postcss').Declaration[]} declarations in document order
 * @return {boolean}
 */
function hasFallback(declarations) {
  /** @type {Set<string> | undefined} */
  let shared;

  for (const { value } of declarations) {
    const gates = gatesIn(value);

    if (shared === undefined) {
      shared = gates;
      continue;
    }

    if (!gates.isSubsetOf(shared)) {
      return true;
    }

    shared = shared.intersection(gates);
  }

  return false;
}

module.exports = { isFallback, hasFallback };
