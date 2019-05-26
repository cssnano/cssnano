import * as R from 'ramda';
import isCustomProp from './isCustomProp';
import isNodeValueEqual from './isNodeValueEqual';

const important = R.prop('important');
const unimportant = R.complement(important);

const hasInherit = isNodeValueEqual('inherit');
const hasInitial = isNodeValueEqual('initial');
const hasRevert = isNodeValueEqual('revert');
const hasUnset = isNodeValueEqual('unset');

// atLeastOneButNotAll :: (a -> Boolean) -> [a] -> Boolean
const atLeastOneButNotAll = R.curry((fn, list) =>
  R.both(R.any(fn), R.complement(R.all)(fn))(list)
);

const hasUnmergeableGlobalKeyword = R.anyPass([
  atLeastOneButNotAll(hasInherit),
  atLeastOneButNotAll(hasInitial),
  atLeastOneButNotAll(hasRevert),
  atLeastOneButNotAll(hasUnset),
]);

const hasUnmergeableCustomProp = atLeastOneButNotAll(isCustomProp);

export default (props, includeCustomProps = true) => {
  if (hasUnmergeableGlobalKeyword(props)) {
    return false;
  }

  if (includeCustomProps && hasUnmergeableCustomProp(props)) {
    return false;
  }

  return R.either(R.all(unimportant), R.all(important))(props);
};
