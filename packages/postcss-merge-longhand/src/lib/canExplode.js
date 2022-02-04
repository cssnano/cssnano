'use strict';
const isCustomProp = require('./isCustomProp');

const globalKeywords = new Set(['inherit', 'initial', 'unset', 'revert']);

module.exports = (prop, includeCustomProps = true) => {
  if (
    !prop.value ||
    (includeCustomProps && isCustomProp(prop)) ||
    (prop.value && globalKeywords.has(prop.value.toLowerCase()))
  ) {
    return false;
  }
  return true;
};
