import isCustomProp from './isCustomProp.js';
import globalKeywords from './cssGlobalKeywords.js';

/** @param {import('postcss').Declaration} prop */
export default (prop, includeCustomProps = true) => {
  return !(
    !prop.value ||
    (includeCustomProps && isCustomProp(prop)) ||
    (prop.value && globalKeywords.has(prop.value.toLowerCase()))
  );
};
