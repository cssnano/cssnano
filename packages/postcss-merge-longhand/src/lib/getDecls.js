'use strict';
/**
 * Returns all declarations for the given CSS properties.
 *
 * @param {import('postcss').Rule} rule
 * @param {Set<string>} properties the CSS properties to search for
 * @return {import('postcss').Declaration[]}
 */
module.exports = function getDeclarationsThatMatchProperties(rule, properties) {
  return /** @type {import('postcss').Declaration[]} */ (
    rule.nodes.filter(
      (node) => node.type === 'decl' && properties.has(node.prop.toLowerCase())
    )
  );
};
