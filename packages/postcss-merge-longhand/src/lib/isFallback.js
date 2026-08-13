'use strict';
const valueParser = require('postcss-value-parser');

/**
 * @param {string} value
 * @return {Set<string>} the lowercased name of every function in the value
 */
function functionNames(value) {
  /** @type {Set<string>} */
  const names = new Set();

  valueParser(value).walk((node) => {
    if (node.type === 'function' && node.value) {
      names.add(node.value.toLowerCase());
    }
  });

  return names;
}

/**
 * Authors write a fallback by declaring a property twice, where the later
 * value uses syntax that older browsers cannot parse; those browsers drop the
 * later declaration and keep the earlier one. Discarding the earlier
 * declaration, or folding it into a shorthand, therefore changes rendering.
 *
 * A later value that introduces a function the earlier one does not use is
 * assumed to be such an enhancement, since support for a function is what
 * decides whether the declaration parses at all.
 *
 * @param {import('postcss').Declaration} earlier
 * @param {import('postcss').Declaration} later
 * @return {boolean} whether earlier is a fallback for later
 */
module.exports = (earlier, later) =>
  !functionNames(later.value).isSubsetOf(functionNames(earlier.value));
