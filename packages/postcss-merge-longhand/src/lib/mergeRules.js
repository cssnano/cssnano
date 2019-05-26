import * as R from 'ramda';
import allExcept from './allExcept';
import equalImportance from './equalImportance';
import hasAllProps from './hasAllProps';
import getDecls from './getDecls';
import getRules from './getRules';
import includedIn from './includedIn';

const isConflictingProp = R.curry((propA, propB) => {
  if (!propB.prop || !equalImportance(propB, propA)) {
    return;
  }

  const parts = propA.prop.split('-');

  return parts.some(() => {
    parts.pop();

    return parts.join('-') === propB.prop;
  });
});

function hasConflicts(match, nodes) {
  const indexes = match.map((n) => nodes.indexOf(n));
  const firstNode = Math.min(...indexes);
  const lastNode = Math.max(...indexes);
  const between = nodes.slice(firstNode + 1, lastNode);

  return match.some((a) => between.some(isConflictingProp(a)));
}

export default function mergeRules(rule, properties, callback) {
  let decls = getDecls(rule, properties);

  while (decls.length) {
    const last = R.last(decls);
    const props = decls.filter(equalImportance(last));
    const rules = getRules(props, properties);

    if (
      hasAllProps(rules, properties) &&
      !hasConflicts(rules, rule.nodes) &&
      callback(rules, last, props)
    ) {
      decls = R.reject(includedIn(rules), decls);
    }

    decls = allExcept(last, decls);
  }
}
