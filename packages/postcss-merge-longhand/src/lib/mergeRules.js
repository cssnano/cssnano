'use strict';
const hasAllProps = require('./hasAllProps');
const getDecls = require('./getDecls');
const getRules = require('./getRules');

function isConflictingProp(propA, propB) {
  if (!propB.prop || propB.important !== propA.important) {
    return;
  }

  const parts = propA.prop.split('-');

  return parts.some(() => {
    parts.pop();

    return parts.join('-') === propB.prop;
  });
}

function hasConflicts(match, nodes) {
  const firstNode = Math.min.apply(
    null,
    match.map((n) => nodes.indexOf(n))
  );
  const lastNode = Math.max.apply(
    null,
    match.map((n) => nodes.indexOf(n))
  );
  const between = nodes.slice(firstNode + 1, lastNode);

  return match.some((a) => between.some((b) => isConflictingProp(a, b)));
}

module.exports = function mergeRules(rule, properties, callback) {
  let decls = getDecls(rule, properties);

  while (decls.length) {
    const last = decls[decls.length - 1];
    const props = decls.filter((node) => node.important === last.important);
    const rules = getRules(props, properties);

    if (hasAllProps(rules, ...properties) && !hasConflicts(rules, rule.nodes)) {
      if (callback(rules, last, props)) {
        decls = decls.filter((node) => !rules.includes(node));
      }
    }

    decls = decls.filter((node) => node !== last);
  }
};
