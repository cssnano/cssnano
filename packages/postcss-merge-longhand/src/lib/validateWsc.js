import cssnanoUtils from 'cssnano-utils';
import { list } from 'postcss';
import colors from './colornames.js';
import { systemColors } from './systemColors.js';

import {
  lineStyles,
  lineWidthKeywords,
  colorFunctions,
  borderComponents,
} from './spec.js';
import { isSubstitution, isUnresolved } from './unresolved.js';

const { TokenType, asciiLowerCase, decoded, lengthUnits, tokens } =
  cssnanoUtils;
const lengthValueRegex =
  /^([+\-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+\-]?\d+)?)([a-z]+)?$/v;
const hexColorRegex = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/v;

/**
 * @param {string} value
 * @return {boolean}
 */
function isBorderStyle(value) {
  return value !== undefined && lineStyles.has(asciiLowerCase(value));
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
  if (!value) {
    return false;
  }

  const lowered = asciiLowerCase(value);

  if (lineWidthKeywords.has(lowered)) {
    return true;
  }

  if (isTypedAsWidth(value)) {
    return true;
  }

  const match = lengthValueRegex.exec(lowered);

  if (!match) {
    return false;
  }

  const [, number, unit] = match;

  if (number.startsWith('-')) {
    return false;
  }

  if (unit === undefined) {
    return Number(number) === 0;
  }

  return lengthUnits.has(unit);
}

/**
 * @param {string} value
 * @return {boolean} whether the value calls a function that produces a colour
 */
function callsColorFunction(value) {
  for (const token of tokens(value)) {
    if (
      token[0] === TokenType.Function &&
      colorFunctions.has(asciiLowerCase(decoded(token)))
    ) {
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

  const lowered = asciiLowerCase(value);

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

  if (systemColors.has(lowered)) {
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
  const parts = list.space(value);

  if (parts.length !== 1) {
    return false;
  }

  const [token] = parts;

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

export {
  isBorderStyle,
  isBorderWidth,
  isColor,
  isValidWidthStyleColor,
  specifiesComponent,
  specifiesDistinctComponents,
};
