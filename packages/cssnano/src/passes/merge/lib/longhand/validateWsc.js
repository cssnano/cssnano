import cssnanoUtils from '#utils';
import { isLengthValue, parseDimension } from './lengthGrammar.js';
import { splitComponents } from './componentRanges.js';
import { isHexColorDigits } from './asciiCharacters.js';
import { systemColors } from './systemColors.js';

import {
  lineStyles,
  lineWidthKeywords,
  colorFunctions,
  namedColors,
} from './spec.js';
import { isSubstitution, isUnresolved } from './unresolved.js';

const { TokenType, asciiLowerCase, decoded } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ValueComponent} from './componentRanges.js' */

/**
 * The classifiers take a component's text and, for a component with a `(`, the
 * tokens of its range in the list that spells the component.
 *
 * @typedef {(text: string, tokens: readonly CSSToken[] | undefined, start: number, end: number) => boolean} ComponentClassifier
 */

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
 * @param {readonly CSSToken[] | undefined} tokens
 * @param {number} start
 * @param {number} end
 * @return {boolean}
 */
function isTypedAsWidth(tokens, start, end) {
  return (
    isUnresolved(tokens, start, end) && !isSubstitution(tokens, start, end)
  );
}

/** @type {ComponentClassifier} */
function isBorderWidth(text, tokens, start, end) {
  if (!text) {
    return false;
  }

  const lowered = asciiLowerCase(text);

  if (lineWidthKeywords.has(lowered)) {
    return true;
  }

  if (isTypedAsWidth(tokens, start, end)) {
    return true;
  }

  const dimension = parseDimension(lowered);

  return (
    dimension !== undefined &&
    isLengthValue(dimension.number, dimension.unit, false, true)
  );
}

/**
 * @param {string} text
 * @param {readonly CSSToken[] | undefined} tokens
 * @param {number} start
 * @param {number} end
 * @return {boolean} whether the component calls a function that produces a
 * colour
 */
function callsColorFunction(text, tokens, start, end) {
  if (tokens === undefined || !text.includes('(')) {
    return false;
  }

  for (let index = start; index < end; index++) {
    const token = tokens[index];
    if (
      token[0] === TokenType.Function &&
      colorFunctions.has(asciiLowerCase(decoded(token)))
    ) {
      return true;
    }
  }

  return false;
}

/** @type {ComponentClassifier} */
function isColor(text, tokens, start, end) {
  if (!text) {
    return false;
  }

  const lowered = asciiLowerCase(text);

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

  return callsColorFunction(lowered, tokens, start, end);
}

/**
 * Any two components a value names make it valid; the parser reports which
 * ones it named, so this reads no string again.
 *
 * @param {{specified: {width: boolean, style: boolean, color: boolean}}} wscs
 * @return {boolean}
 */
function isValidWidthStyleColor(wscs) {
  const {
    width: validWidth,
    style: validStyle,
    color: validColor,
  } = wscs.specified;

  return (
    (validWidth && validStyle) ||
    (validWidth && validColor) ||
    (validStyle && validColor)
  );
}

/* Keyed by the names `borderComponents` gives, which are the last segment of
 * every border property that names one component. No token matches two of
 * these, so the first match is the component a token represents. */
/** @type {Map<string, ComponentClassifier>} */
const classifiers = new Map([
  ['width', isBorderWidth],
  ['style', isBorderStyle],
  ['color', isColor],
]);

/**
 * @param {ValueComponent} part
 * @return {string | undefined} the component the part represents, if any
 */
function componentOf({ raw, list, start, end }) {
  for (const [component, is] of classifiers) {
    if (is(raw, list, start, end)) {
      return component;
    }
  }

  return undefined;
}

/**
 * Whether one component names the border component, or is a substitution that
 * may stand for it.
 *
 * @param {ValueComponent} part
 * @param {string} component one of `borderComponents`
 * @return {boolean}
 */
function namesComponent(part, component) {
  return (
    componentOf(part) === component ||
    isSubstitution(part.list, part.start, part.end)
  );
}

/**
 * A property that names one component takes one token, so a value of several
 * specifies nothing however well each token reads on its own: the browser
 * ignores `border-left-color: red blue` whole.
 *
 * @param {string} value
 * @param {readonly CSSToken[] | undefined} tokens the tokens `value` spells
 * @param {string} component one of `borderComponents`
 * @return {boolean} whether the value can be what that component is set to
 */
function specifiesComponent(value, tokens, component) {
  const parts = splitComponents(value, tokens);

  if (parts.length !== 1) {
    return false;
  }

  return namesComponent(parts[0], component);
}

export {
  isBorderStyle,
  isBorderWidth,
  isColor,
  isValidWidthStyleColor,
  namesComponent,
  specifiesComponent,
};
