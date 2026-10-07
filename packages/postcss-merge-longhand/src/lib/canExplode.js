import { isCssWideKeyword } from './isCssWideKeyword.js';
import isCustomProp from './isCustomProp.js';

/** @param {import('postcss').Declaration} prop */
export default (prop, includeCustomProps = true) => {
  return !(
    !prop.value ||
    (includeCustomProps && isCustomProp(prop)) ||
    (prop.value && isCssWideKeyword(prop.value))
  );
};
