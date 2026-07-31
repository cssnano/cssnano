'use strict';
const colors = require('./colornames.js');

const widthKeywords = new Set(['thin', 'medium', 'thick']);
const borderStyles = new Set([
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
const lengthValueRegex = /^(\d+(\.\d+)?|\.\d+)(\w+)?$/;
const colorFunctionRegex = /(:?rgba?|hsla?|hwb|lch|oklab|oklch|color)\(/;
const hexColorRegex = /#([0-9a-z]{6}|[0-9a-z]{3})/;

/**
 * @param {string} value
 * @return {boolean}
 */
function isBorderStyle(value) {
  return value !== undefined && borderStyles.has(value.toLowerCase());
}

/**
 * @param {string} value
 * @return {boolean}
 */
function isBorderWidth(value) {
  return (
    (value && widthKeywords.has(value.toLowerCase())) ||
    lengthValueRegex.test(value)
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

  if (colorFunctionRegex.test(value)) {
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
function isValidWidthStyleColor(wscs) {
  const validWidth = isBorderWidth(wscs[0]);
  const validStyle = isBorderStyle(wscs[1]);
  const validColor = isColor(wscs[2]);

  return (
    (validWidth && validStyle) ||
    (validWidth && validColor) ||
    (validStyle && validColor)
  );
}

module.exports = {
  isBorderStyle,
  isBorderWidth,
  isColor,
  isValidWidthStyleColor,
};
