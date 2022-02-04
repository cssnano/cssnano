'use strict';
const { unit } = require('postcss-value-parser');

module.exports = function isNum(node) {
  return unit(node.value);
};
