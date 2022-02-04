'use strict';
const { unit } = require('postcss-value-parser');
const { colord, extend } = require('colord');
const namesPlugin = require('colord/plugins/names');

extend([namesPlugin]);

/* Code derived from https://github.com/pigcan/is-color-stop */

const lengthUnits = new Set([
  'PX',
  'IN',
  'CM',
  'MM',
  'EM',
  'REM',
  'POINTS',
  'PC',
  'EX',
  'CH',
  'VW',
  'VH',
  'VMIN',
  'VMAX',
  '%',
]);

function isCSSLengthUnit(input) {
  return lengthUnits.has(input.toUpperCase());
}

function isStop(str) {
  if (str) {
    let stop = false;
    const node = unit(str);
    if (node) {
      const number = Number(node.number);
      if (number === 0 || (!isNaN(number) && isCSSLengthUnit(node.unit))) {
        stop = true;
      }
    } else {
      stop = /^calc\(\S+\)$/g.test(str);
    }
    return stop;
  }
  return true;
}

module.exports = function isColorStop(color, stop) {
  return colord(color).isValid() && isStop(stop);
};
