import * as R from 'ramda';

const isNodeValue = (fn) =>
  R.compose(
    R.ifElse(
      R.isNil,
      R.F,
      R.compose(
        fn,
        R.toLower
      )
    ),
    R.prop('value')
  );

export default isNodeValue;
