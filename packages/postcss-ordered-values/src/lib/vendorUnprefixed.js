'use strict';
function vendorUnprefixed(prop) {
  return prop.replace(/^-\w+-/, '');
}

module.exports = vendorUnprefixed;
