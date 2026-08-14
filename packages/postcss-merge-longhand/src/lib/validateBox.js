'use strict';
const { list } = require('postcss');
const { sides } = require('./spec.js');
const { isUnresolved } = require('./unresolved.js');

/* CSS user agents ignore margin and padding declarations that violate the
 * property's grammar: margin rejects negative values and auto,
 * padding rejects both and bounds values at zero. */

/* Parse CSS dimension format: a number with optional exponent and unit
 * (percentage or keyword). Only zero can omit a unit. */
const dimensionRegex =
  /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)(%|[a-z]+)?$/i;

/* Padding forbids auto and negative values; margin allows both. */
const grammars = new Map([
  ['margin', { auto: true, negative: true }],
  ['padding', { auto: false, negative: false }],
]);

/**
 * @param {string} token
 * @param {{auto: boolean, negative: boolean}} grammar
 * @return {boolean}
 */
function specifiesSide(token, grammar) {
  if (isUnresolved(token)) {
    return true;
  }

  const lowered = token.toLowerCase();

  if (lowered === 'auto') {
    return grammar.auto;
  }

  const match = dimensionRegex.exec(lowered);

  if (!match) {
    return false;
  }

  const [, number, unit] = match;

  /* Only zero may go without a unit; `margin: 5` is no length. */
  if (unit === undefined && Number(number) !== 0) {
    return false;
  }

  return grammar.negative || !number.startsWith('-');
}

/**
 * @param {string} prop lower-cased, a property of one of the two families
 * @param {string} value
 * @return {boolean} whether the browser keeps the declaration
 */
function browserKeeps(prop, value) {
  const [family] = prop.split('-');
  const grammar = grammars.get(family);

  if (grammar === undefined) {
    return false;
  }

  const tokens = list.space(value);

  /* The shorthand spreads one to four values across the sides; a property
   * naming a side takes exactly the one. */
  const most = prop === family ? sides.length : 1;

  if (tokens.length === 0 || tokens.length > most) {
    return false;
  }

  return tokens.every((token) => specifiesSide(token, grammar));
}

module.exports = { browserKeeps };
