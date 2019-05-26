import * as R from 'ramda';
import isNodePropEqual from './isNodePropEqual';

export default R.curry((rule, prop) =>
  R.compose(
    R.last,
    R.filter(isNodePropEqual(prop))
  )(rule)
);
