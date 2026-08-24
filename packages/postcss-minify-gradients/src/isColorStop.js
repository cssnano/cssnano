import postcssValueParser from 'postcss-value-parser';
import { colordx as colord, extend } from '@colordx/core';
import hwbPlugin from '@colordx/core/plugins/hwb';
import namesPlugin from '@colordx/core/plugins/names';

const { unit } = postcssValueParser;
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
    let colorStop = false;
    const node = unit(str);
    if (node) {
      const number = Number(node.number);
      if (
        number === 0 ||
        (!Number.isNaN(number) && isCSSLengthUnit(node.unit))
      ) {
        colorStop = true;
      }
    } else {
      colorStop = colorStopRegex.test(str);
    }
    return colorStop;
  }
  return true;
}
/**
 * @param {string} color
 * @param {string} [stop]
 * @return {boolean}
 */
function isColorStop(color, stop) {
  return colord(color).isValid() && isStop(stop);
}

export default isColorStop;
