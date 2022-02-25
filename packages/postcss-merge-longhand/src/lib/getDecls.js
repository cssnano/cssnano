'use strict';
module.exports = function getDecls(rule, properties) {
  return rule.nodes.filter(
    (node) =>
      node.type === 'decl' && properties.includes(node.prop.toLowerCase())
  );
};
