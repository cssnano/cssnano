'use strict';
const { list } = require('postcss');
const { isWidth, isStyle, isColor } = require('./validateWsc.js');

const none = /^\s*(none|medium)(\s+none(\s+(none|currentcolor))?)?\s*$/i;

const varRE = /(^.*var)(.*\(.*--.*\))(.*)/i;
/** @type {(p: RegExpExecArray) => string} */
const varPreserveCase = (p) =>
  `${p[1].toLowerCase()}${p[2]}${p[3].toLowerCase()}`;
/** @type {(v: string) => string} */
const toLower = (v) => {
  const match = varRE.exec(v);
  return match ? varPreserveCase(match) : v.toLowerCase();
};

/**
 * @param {string} value
 * @return {[string, string, string]}
 */
module.exports = function parseWsc(value) {
  if (none.test(value)) {
    return ['medium', 'none', 'currentcolor'];
  }

  let width, style, color;

  const values = list.space(value);

  if (
    values.length > 1 &&
    isStyle(values[1]) &&
    values[0].toLowerCase() === 'none'
  ) {
    values.unshift();
    width = '0';
  }

  /** @type {string[]} */
  const unknown = [];

  values.forEach((v) => {
    if (isStyle(v)) {
      style = toLower(v);
    } else if (isWidth(v)) {
      width = toLower(v);
    } else if (isColor(v)) {
      color = toLower(v);
    } else {
      unknown.push(v);
    }
  });

  if (unknown.length) {
    if (!width && style && color) {
      width = unknown.pop();
    }

    if (width && !style && color) {
      style = unknown.pop();
    }

    if (width && style && !color) {
      color = unknown.pop();
    }
  }

  return /** @type {[string, string, string]} */ ([width, style, color]);
};
