'use strict';
module.exports = function getDecls(rule, properties) {
  return rule.nodes.filter(
    ({ prop }) => prop && properties.includes(prop.toLowerCase())
  );
};
