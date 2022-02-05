'use strict';
module.exports = (node) => ~node.value.search(/var\s*\(\s*--/i);
