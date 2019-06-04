import * as R from 'ramda';

const nodeValueIncludes = R.curry((str, node) =>
  R.compose(
    R.ifElse(R.isNil, R.F, R.includes(str)),
    R.prop('value')
  )(node)
);

export default nodeValueIncludes;
