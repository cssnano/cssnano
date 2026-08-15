'use strict';
const { unit } = require('postcss-value-parser');
const { colordx: colord, extend } = require('@colordx/core');
const hwbPlugin = require('@colordx/core/plugins/hwb');
const namesPlugin = require('@colordx/core/plugins/names');

extend([
  /** @type {import('@colordx/core').Plugin} */ (
    /** @type {unknown} */ (hwbPlugin)
  ),
  /** @type {import('@colordx/core').Plugin} */ (
    /** @type {unknown} */ (namesPlugin)
  ),
]);

/* Code derived from https://www.npmjs.com/package/is-color-stop Licensed under MIT license */

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

const colorStopRegex = /^calc\(\S+\)$/g;

/**
 * @param {string} input
 * @return {boolean}
 */
function isCSSLengthUnit(input) {
  return lengthUnits.has(input.toUpperCase());
}
/**
 * @param {string|undefined} str
 * @return {boolean}
 */
function isStop(str) {
  if (str) {
    let isColorStop = false;
    const node = unit(str);
    if (node) {
      const number = Number(node.number);
      if (
        number === 0 ||
        (!Number.isNaN(number) && isCSSLengthUnit(node.unit))
      ) {
        isColorStop = true;
      }
    } else {
      isColorStop = colorStopRegex.test(str);
    }
    return isColorStop;
  }
  return true;
}
/**
 * @param {string} color
 * @param {string} [stop]
 * @return {boolean}
 */
module.exports = function isColorStop(color, stop) {
  return colord(color).isValid() && isStop(stop);
};
