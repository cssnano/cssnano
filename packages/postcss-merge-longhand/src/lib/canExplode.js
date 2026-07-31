'use strict';
const isCustomProp = require('./isCustomProp');

const globalKeywords = require('./cssGlobalKeywords.js');

/** @type {(prop: import('postcss').Declaration, includeCustomProps?: boolean) => boolean} */
module.exports = (prop, includeCustomProps = true) => {
  return !(
    !prop.value ||
    (includeCustomProps && isCustomProp(prop)) ||
    (prop.value && globalKeywords.has(prop.value.toLowerCase()))
  );
};
