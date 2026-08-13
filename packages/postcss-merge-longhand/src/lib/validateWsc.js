'use strict';
const colors = require('./colornames.js');
const { lineStyles, lineWidthKeywords, colorFunctions } = require('./spec.js');

const lengthValueRegex = /^(\d+(\.\d+)?|\.\d+)(\w+)?$/;
const functionNameRegex = /([\w-]+)\(/g;
const hexColorRegex = /#([0-9a-z]{6}|[0-9a-z]{3})/;

/**
 * @param {string} value
 * @return {boolean}
 */
function isBorderStyle(value) {
  return value !== undefined && lineStyles.has(value.toLowerCase());
}

/**
 * @param {string} value
 * @return {boolean}
 */
function isBorderWidth(value) {
  return (
    (value && lineWidthKeywords.has(value.toLowerCase())) ||
    lengthValueRegex.test(value)
  );
}

/**
 * @param {string} value
 * @return {boolean} whether the value calls a function that produces a colour
 */
function callsColorFunction(value) {
  for (const [, name] of value.matchAll(functionNameRegex)) {
    if (colorFunctions.has(name)) {
      return true;
    }
  }

  return false;
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

  if (callsColorFunction(value)) {
    return true;
  }

  if (hexColorRegex.test(value)) {
    return true;
  }

  /* `currentcolor` stands outside the named colours, which hold `transparent`. */
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
