'use strict';
/**
 * Returns all declarations for the given CSS properties.
 *
 * @param {import('postcss').Rule} rule
 * @param {Set<string>} properties the CSS properties to search for
 * @return {Set<import('postcss').Declaration>}
 */
module.exports = function getDeclarationsThatMatchProperties(rule, properties) {
  const decls = new Set();

  for (const node of rule.nodes) {
    if (node.type === 'decl' && properties.has(node.prop.toLowerCase())) {
      decls.add(node);
    }
  }

  return decls;
};
