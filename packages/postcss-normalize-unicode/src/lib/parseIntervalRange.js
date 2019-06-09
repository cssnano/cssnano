import * as R from 'ramda';

const parseIntervalRange = R.compose(
  R.map(R.split('')),
  R.split('-'),
  R.drop(2)
);

export default parseIntervalRange;
