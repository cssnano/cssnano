import { tokenize, TokenType } from '@csstools/css-tokenizer';
import { colordx as colord, extend } from '@colordx/core';
import hwbPlugin from '@colordx/core/plugins/hwb';
import namesPlugin from '@colordx/core/plugins/names';

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
    const node = [...tokenize({ css: str })].find(
      (token) => token[0] !== TokenType.EOF
    );
    if (
      node &&
      [TokenType.Number, TokenType.Dimension, TokenType.Percentage].includes(
        node[0]
      )
    ) {
      const metadata = /** @type {{value?: number, unit?: string}} */ (node[4]);
      const number = metadata.value;
      if (
        number === 0 ||
        (number !== undefined &&
          isCSSLengthUnit(
            metadata.unit ?? (node[0] === TokenType.Percentage ? '%' : '')
          ))
      )
        colorStop = true;
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
