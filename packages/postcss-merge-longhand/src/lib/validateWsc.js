import cssnanoUtils from 'cssnano-utils';
import { list } from 'postcss';
import { isLengthValue, parseDimension } from './lengthGrammar.js';
import { isHexColorDigits } from './asciiCharacters.js';
import { systemColors } from './systemColors.js';

import {
  lineStyles,
  lineWidthKeywords,
  colorFunctions,
  namedColors,
} from './spec.js';
import { isSubstitution, isUnresolved } from './unresolved.js';

const { TokenType, asciiLowerCase, decoded, tokens } = cssnanoUtils;

/**
 * @param {string | undefined} value
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
 * @param {string | undefined} value
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

  const dimension = parseDimension(lowered);

  return (
    dimension !== undefined &&
    isLengthValue(dimension.number, dimension.unit, false, true)
  );
}

/**
 * @param {string} value
 * @return {boolean} whether the value calls a function that produces a colour
 */
function callsColorFunction(value) {
  if (!value.includes('(')) {
    return false;
  }

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
 * @param {string | undefined} value
 * @return {boolean}
 */
function isColor(value) {
  if (!value) {
    return false;
  }

  const lowered = asciiLowerCase(value);

  if (lowered.startsWith('#') && isHexColorDigits(lowered.slice(1))) {
    return true;
  }

  /* `currentcolor` is not in the CSS named-color keywords. */
  if (lowered === 'currentcolor') {
    return true;
  }

  if (namedColors.has(lowered)) {
    return true;
  }

  if (systemColors.has(lowered)) {
    return true;
  }

  return callsColorFunction(lowered);
}

/**
 * @param {{width: (string|undefined), style: (string|undefined), color: (string|undefined)}} wscs
 * @return {boolean}
 */
function isValidWidthStyleColor(wscs) {
  const validWidth = isBorderWidth(wscs.width);
  const validStyle = isBorderStyle(wscs.style);
  const validColor = isColor(wscs.color);

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

export {
  isBorderStyle,
  isBorderWidth,
  isColor,
  isValidWidthStyleColor,
  specifiesComponent,
};
