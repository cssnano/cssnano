import { isCssWideKeyword } from './isCssWideKeyword.js';
import isCustomProp from './isCustomProp.js';

/**
 * @param {import('postcss').Declaration} prop
 * @param {import('../../../../values/textTable.js').TextTable} textTable
 * @param {boolean} [includeCustomProps]
 */
export default (prop, textTable, includeCustomProps = true) => {
  return !(
    !prop.value ||
    (includeCustomProps && isCustomProp(prop, textTable)) ||
    (prop.value && isCssWideKeyword(prop.value))
  );
};
