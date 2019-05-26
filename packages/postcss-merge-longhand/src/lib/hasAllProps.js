import * as R from 'ramda';
import isNodePropEqual from './isNodePropEqual';

const hasAllProps = R.curry((rule, props) =>
  R.all((prop) => R.any(isNodePropEqual(prop), rule), props)
);

export default hasAllProps;
