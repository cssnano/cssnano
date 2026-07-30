'use strict';
/**
 * @param {string} value
 * @return {string}
 */
module.exports = function (value) {
  const lowerCasedValue = value.toLowerCase();

  if (lowerCasedValue === 'normal') {
    return '400';
  } else {
    return lowerCasedValue === 'bold' ? '700' : value;
  }
};
