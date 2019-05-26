import * as R from 'ramda';
import getValue from './getValue';
import lowercaseEq from './lowercaseEq';

const isNodeValueEqual = R.curry((keyword, node) =>
  R.compose(
    R.ifElse(R.isNil, R.F, lowercaseEq(keyword)),
    getValue
  )(node)
);

export default isNodeValueEqual;
