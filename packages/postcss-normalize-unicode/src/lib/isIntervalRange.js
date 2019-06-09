import * as R from 'ramda';
import isWordNode from './isWordNode';

const isIntervalRange = R.both(
  isWordNode,
  R.compose(
    R.includes('-'),
    R.prop('value')
  )
);

export default isIntervalRange;
