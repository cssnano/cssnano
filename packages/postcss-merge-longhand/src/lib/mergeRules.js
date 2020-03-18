import hasAllProps from './hasAllProps';
import getDecls from './getDecls';
import getRules from './getRules';

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

export default function mergeRules(rule, properties, callback) {
  let decls = getDecls(rule, properties);

  while (decls.length) {
    const last = decls[decls.length - 1];
    const props = decls.filter((node) => node.important === last.important);
    const rules = getRules(props, properties);

    if (hasAllProps(rules, ...properties) && !hasConflicts(rules, rule.nodes)) {
      if (callback(rules, last, props)) {
        decls = decls.filter((node) => !~rules.indexOf(node));
      }
    }

    decls = decls.filter((node) => node !== last);
  }
}
