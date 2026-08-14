'use strict';
const { list } = require('postcss');
const colors = require('./colornames.js');
const {
  lineStyles,
  lineWidthKeywords,
  colorFunctions,
  borderComponents,
} = require('./spec.js');

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

/* Keyed by the names `borderComponents` gives, which are the last segment of
 * every border property that names one component. No token answers to two of
 * these, so the first match is the component a token states. */
const classifiers = new Map([
  ['width', isBorderWidth],
  ['style', isBorderStyle],
  ['color', isColor],
]);
const callsFunction = /\(/;

/**
 * @param {string} token
 * @return {boolean} whether what the token states is out of reach, so that any
 * component it is read as has to be taken on trust
 */
function isUnresolved(token) {
  return callsFunction.test(token);
}

/**
 * @param {string} token
 * @return {string | undefined} the component the token states, if it states one
 */
function componentOf(token) {
  for (const [component, is] of classifiers) {
    if (is(token)) {
      return component;
    }
  }

  return undefined;
}

/**
 * @param {string} value
 * @param {string} component one of `borderComponents`
 * @return {boolean} whether the value can be what that component is set to
 */
function statesComponent(value, component) {
  return componentOf(value) === component || isUnresolved(value);
}

/**
 * `<line-width> || <line-style> || <color>` takes its three components in any
 * order and leaves any of them out, but states none of them twice and admits
 * nothing else, so `border: solid red red` and `border: 1px solid 50%` are
 * invalid and the browser drops them whole.
 *
 * `parseWsc` cannot say so: it overwrites the component a repeat already
 * filled, and drops a token it recognises as nothing into whichever slot is
 * still free, so the triple it hands back can be one the value never stated.
 *
 * @param {string} value
 * @return {boolean} whether every token of the value states a component of its
 * own
 */
function statesDistinctComponents(value) {
  /** @type {Set<string>} */
  const stated = new Set();
  let unresolved = 0;

  for (const token of list.space(value)) {
    const component = componentOf(token);

    if (component === undefined) {
      if (!isUnresolved(token)) {
        return false;
      }

      unresolved++;
      continue;
    }

    if (stated.has(component)) {
      return false;
    }

    stated.add(component);
  }

  return stated.size + unresolved <= borderComponents.length;
}

module.exports = {
  isBorderStyle,
  isBorderWidth,
  isColor,
  isValidWidthStyleColor,
  statesComponent,
  statesDistinctComponents,
};
