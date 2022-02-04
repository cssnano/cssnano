'use strict';
module.exports = function isMixin(node) {
  const { selector } = node;

  // If the selector ends with a ':' it is likely a part of a custom mixin.
  if (!selector || selector[selector.length - 1] === ':') {
    return true;
  }

  return false;
};
