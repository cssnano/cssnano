import * as R from 'ramda';
import lowercaseEq from './lowercaseEq';

const isNodePropEqual = R.curry((keyword, node) =>
  R.compose(
    R.ifElse(R.isNil, R.F, lowercaseEq(keyword)),
    R.prop('prop')
  )(node)
);

export default isNodePropEqual;
