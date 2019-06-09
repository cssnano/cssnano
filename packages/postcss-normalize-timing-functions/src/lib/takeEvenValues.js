import * as R from 'ramda';

const evenValues = R.compose(
  (index) => index % 2 === 0,
  R.nthArg(1)
);

const takeEvenValues = R.addIndex(R.filter)(evenValues);

export default takeEvenValues;
