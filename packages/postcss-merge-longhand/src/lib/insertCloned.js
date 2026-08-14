'use strict';
const { inheritGates } = require('./isFallback.js');

/**
 * @param {import('postcss').Rule} rule
 * @param {import('postcss').Declaration} decl
 * @param {Partial<import('postcss').DeclarationProps>=} props
 * @return {import('postcss').Declaration}
 */
module.exports = function insertCloned(rule, decl, props) {
  const newNode = Object.assign(decl.clone(), props);

  rule.insertAfter(decl, newNode);
  /* Every node explode and merge create passes through here, so recording the
   * gates once keeps a node that carries a component of a gated declaration
   * from looking unconditional on its own. */
  inheritGates(decl, newNode);

  return newNode;
};
