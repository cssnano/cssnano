'use strict';
const { list } = require('postcss');
const colors = require('./colornames.js');
const {
  lineStyles,
  lineWidthKeywords,
  colorFunctions,
  borderComponents,
} = require('./spec.js');
const { isUnresolved } = require('./unresolved.js');

const lengthValueRegex = /^(\d+(\.\d+)?|\.\d+)(\w+)?$/;
const functionNameRegex = /([\w-]+)\(/g;
const hexColorRegex = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/;

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

  const lowered = value.toLowerCase();

  if (callsColorFunction(lowered)) {
    return true;
  }

  if (hexColorRegex.test(lowered)) {
    return true;
  }

  /* `currentcolor` stands outside the named colours, which hold `transparent`. */
  if (lowered === 'currentcolor') {
    return true;
  }

  return colors.has(lowered);
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
 * every border property that names one component. No token matches two of
 * these, so the first match is the component a token represents. */
const classifiers = new Map([
  ['width', isBorderWidth],
  ['style', isBorderStyle],
  ['color', isColor],
]);

/**
 * @param {string} token
 * @return {string | undefined} the component the token represents, if any
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
 * A property that names one component takes one token, so a value of several
 * specifies nothing however well each token reads on its own: the browser
 * ignores `border-left-color: red blue` whole.
 *
 * @param {string} value
 * @param {string} component one of `borderComponents`
 * @return {boolean} whether the value can be what that component is set to
 */
function specifiesComponent(value, component) {
  const tokens = list.space(value);

  if (tokens.length !== 1) {
    return false;
  }

  const [token] = tokens;

  return componentOf(token) === component || isUnresolved(token);
}

/**
 * `<line-width> || <line-style> || <color>` takes its three components in any
 * order and leaves any of them out, but specifies none of them twice and
 * admits nothing else, so `border: solid red red` and `border: 1px solid 50%`
 * are invalid and the browser ignores them.
 *
 * `parseWsc` does not validate this: it overwrites the component a repeat
 * already filled, and ignores unrecognized tokens into whichever slot is still
 * free, so the triple it returns can differ from the input's components.
 *
 * @param {string} value
 * @return {boolean} whether every token of the value specifies a component of
 * its own
 */
function specifiesDistinctComponents(value) {
  /** @type {Set<string>} */
  const specified = new Set();
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

    if (specified.has(component)) {
      return false;
    }

    specified.add(component);
  }

  return specified.size + unresolved <= borderComponents.length;
}

module.exports = {
  isBorderStyle,
  isBorderWidth,
  isColor,
  isValidWidthStyleColor,
  specifiesComponent,
  specifiesDistinctComponents,
};
