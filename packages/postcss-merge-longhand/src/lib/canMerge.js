import isCustomProp from './isCustomProp.js';
import cssGlobalKeywords from './cssGlobalKeywords.js';

/** @type {(node: import('postcss').Declaration) => boolean} */
const important = (decl) => decl.important;
/** @type {(node: import('postcss').Declaration) => boolean} */
const unimportant = (decl) => !decl.important;
/** @param {import('postcss').Declaration[]} declarations */
export default (declarations, includeCustomProps = true) => {
  const uniqueProperties = new Set(
    declarations.map((node) => node.value.toLowerCase())
  );

  if (
    uniqueProperties.size > 1 &&
    !uniqueProperties.isDisjointFrom(cssGlobalKeywords)
  ) {
    return false;
  }
  if (includeCustomProps && declarations.some(isCustomProp)) {
    return false;
  }

  return declarations.every(unimportant) || declarations.every(important);
};
