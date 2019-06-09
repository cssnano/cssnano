import * as R from 'ramda';

const isPotentialWildcard = R.compose(
  R.equals(['0', 'f']),
  R.nthArg(0)
);

const isWildcardInPreviousPosition = R.compose(
  R.either(R.propEq(0, '?'), R.isEmpty),
  R.nthArg(1)
);

// The maximum number of wildcard characters (?) for ranges is 5.
const isValidUnicodeRange = R.compose(
  R.either(R.propSatisfies(R.gt(5), 'true'), R.isEmpty),
  R.countBy(R.equals('?')),
  R.nthArg(1)
);

const canConvertToWildcardRange = R.allPass([
  isPotentialWildcard,
  isWildcardInPreviousPosition,
  isValidUnicodeRange,
]);

export default canConvertToWildcardRange;
