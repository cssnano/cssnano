'use strict';
const customPropRegex = /var\s*\(\s*--/i;
/** @type {(node: import('postcss').Declaration) => boolean} */
module.exports = (node) => node.value.search(customPropRegex) !== -1;
