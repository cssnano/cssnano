import * as R from 'ramda';
import fromInitial from '../../data/fromInitial';
import toInitial from '../../data/toInitial';
import cacheFn from './cacheFn';
import lowercaseEq from './lowercaseEq';

const initial = 'initial';

const propOf = R.flip(R.prop);

const hasIn = R.flip(R.has);

const hasSupport = R.nthArg(0);

const property = R.nthArg(1);

const value = R.nthArg(2);

const canConvertToInitial = R.allPass([
  hasSupport,
  R.compose(
    hasIn(toInitial),
    property
  ),
  (_, prop, val) => lowercaseEq(toInitial[prop], val),
]);

const canConvertFromInitial = R.both(
  R.compose(
    lowercaseEq(initial),
    value
  ),
  R.compose(
    hasIn(fromInitial),
    property
  )
);

const otherwise = R.T;

const transform = cacheFn(
  R.cond([
    [canConvertToInitial, () => initial],
    [
      canConvertFromInitial,
      R.compose(
        propOf(fromInitial),
        property
      ),
    ],
    [otherwise, value],
  ])
);

export default transform;
