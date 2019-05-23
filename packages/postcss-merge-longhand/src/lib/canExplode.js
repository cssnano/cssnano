import isCustomProp from './isCustomProp';

const hasGlobalKeyword = (prop) =>
  prop &&
  prop.value &&
  ['inherit', 'initial', 'unset', 'revert'].includes(prop.value.toLowerCase());

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
