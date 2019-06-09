import * as R from 'ramda';
import getValue from './getValue';
import oneOf from './oneOf';

const isNodeValueOneOf = R.curry((keywords, node) =>
  R.compose(
    R.ifElse(R.isNil, R.F, oneOf(keywords)),
    getValue
  )(node)
);

export default isNodeValueOneOf;
