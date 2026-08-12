'use strict';
const isCustomProp = require('./isCustomProp.js');

/** @type {(node: import('postcss').Declaration) => boolean} */
const important = (decl) => decl.important;
/** @type {(node: import('postcss').Declaration) => boolean} */
const unimportant = (decl) => !decl.important;

/* Cannot be combined with other values in shorthand
  https://www.w3.org/TR/css-cascade-5/#shorthand */
const cssGlobalKeywords = require('./cssGlobalKeywords.js');
/**
 * @type {(props: import('postcss').Declaration[], includeCustomProps?: boolean) => boolean}
 */
module.exports = (declarations, includeCustomProps = true) => {
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
