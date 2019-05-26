import isCustomProp from './isCustomProp';
import isNodeValueOneOf from './isNodeValueOneOf';

const hasGlobalKeyword = isNodeValueOneOf([
  'inherit',
  'initial',
  'unset',
  'revert',
]);

export default (prop, includeCustomProps = true) => {
  if (
    !prop.value ||
    (includeCustomProps && isCustomProp(prop)) ||
    hasGlobalKeyword(prop)
  ) {
    return false;
  }
  return true;
};
