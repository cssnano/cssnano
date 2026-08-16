'use strict';
const { list } = require('postcss');
const colors = require('./colornames.js');
const {
  lineStyles,
  lineWidthKeywords,
  colorFunctions,
  borderComponents,
} = require('./spec.js');
const { isSubstitution, isUnresolved } = require('./unresolved.js');

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
 * A math function (`calc()`, `min()`, ...), `attr()` or `if()` fixes its type
 * from its own syntax or context rather than deferring it to substitution, and
 * the only border component whose grammar accepts that type is the width —
 * never a `<line-style>` keyword, never a `<color>`.
 *
 * @param {string} value
 * @return {boolean}
 */
function isTypedAsWidth(value) {
  return isUnresolved(value) && !isSubstitution(value);
}

/**
 * @param {string} value
 * @return {boolean}
 */
function isBorderWidth(value) {
  return (
    (value && lineWidthKeywords.has(value.toLowerCase())) ||
    lengthValueRegex.test(value) ||
    isTypedAsWidth(value)
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

  /* `currentcolor` is not in the CSS named-color keywords. */
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

  return componentOf(token) === component || isSubstitution(token);
}

/**
 * The grammar `<line-width> || <line-style> || <color>` requires each
 * component to appear at most once. `parseWsc` doesn't enforce this: it
 * overwrites repeated components and discards unrecognized tokens, so the
 * returned triple can differ from the input.
 *
 * @param {string} value
 * @return {boolean} whether every token specifies a distinct component
 */
function specifiesDistinctComponents(value) {
  /** @type {Set<string>} */
  const specified = new Set();
  let unresolved = 0;

  for (const token of list.space(value)) {
    const component = componentOf(token);

    if (component === undefined) {
      if (!isSubstitution(token)) {
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
