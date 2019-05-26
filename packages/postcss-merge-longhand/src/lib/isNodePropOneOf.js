import * as R from 'ramda';
import oneOf from './oneOf';

const isNodeValueOneOf = R.curry((keywords, node) =>
  R.compose(
    R.ifElse(R.isNil, R.F, oneOf(keywords)),
    R.prop('prop')
  )(node)
);

export default isNodeValueOneOf;
