'use strict';
module.exports = function (value) {
  const lowerCasedValue = value.toLowerCase();

  return lowerCasedValue === 'normal'
    ? '400'
    : lowerCasedValue === 'bold'
    ? '700'
    : value;
};
