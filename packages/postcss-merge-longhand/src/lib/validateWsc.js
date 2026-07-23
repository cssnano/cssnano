'use strict';
const colors = require('./colornames.js');

const widths = new Set(['thin', 'medium', 'thick']);
const styles = new Set([
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
]);
const widthRegex = /^(\d+(\.\d+)?|\.\d+)(\w+)?$/;
const rgbaRegex = /rgba?\(/;
const hslaRegex = /hsla?\(/;
const hexColorRegex = /#([0-9a-z]{6}|[0-9a-z]{3})/;

/**
 * @param {string} value
 * @return {boolean}
 */
function isStyle(value) {
  return value !== undefined && styles.has(value.toLowerCase());
}

/**
 * @param {string} value
 * @return {boolean}
 */
function isWidth(value) {
  return (
    (value && widths.has(value.toLowerCase())) ||
    widthRegex.test(value)
  );
}

/**
 * @param {string} value
 * @return {boolean}
 */
function isColor(value) {
  if (!value) {
    return false;
  }

  value = value.toLowerCase();

  if (rgbaRegex.test(value)) {
    return true;
  }

  if (hslaRegex.test(value)) {
    return true;
  }

  if (hexColorRegex.test(value)) {
    return true;
  }

  if (value === 'transparent') {
    return true;
  }

  if (value === 'currentcolor') {
    return true;
  }

  return colors.has(value);
}

/**
 * @param {[string, string, string]} wscs
 * @return {boolean}
 */
function isValidWsc(wscs) {
  const validWidth = isWidth(wscs[0]);
  const validStyle = isStyle(wscs[1]);
  const validColor = isColor(wscs[2]);

  return (
    (validWidth && validStyle) ||
    (validWidth && validColor) ||
    (validStyle && validColor)
  );
}

module.exports = { isStyle, isWidth, isColor, isValidWsc };
