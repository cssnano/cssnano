import * as R from 'ramda';
import isNodePropOneOf from './isNodePropOneOf';

export default function getDecls(rule, properties) {
  return R.filter(isNodePropOneOf(properties), rule.nodes);
}
