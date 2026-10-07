import { isAsciiDigit, isHexColorDigits } from '../asciiCharacters.js';
import { withoutVendorPrefix } from '../vendorPrefix.js';
import cssnanoUtils from 'cssnano-utils';
import knownPropertyNames from '../../data/knownProperties.json' with { type: 'json' };
import generatedNumericRanges from '../../data/numericRanges.json' with { type: 'json' };

/** @import {CSSToken} from '@csstools/css-tokenizer' */

const { TokenType, asciiLowerCase, decoded, lengthUnits, tokens } =
  cssnanoUtils;

export const transformFunctions = new Set([
  'translate',
  'translatex',
  'translatey',
  'translatez',
  'translate3d',
  'scale',
  'scalex',
  'scaley',
  'scalez',
  'scale3d',
  'rotate',
  'rotatex',
  'rotatey',
  'rotatez',
  'rotate3d',
  'skew',
  'skewx',
  'skewy',
  'perspective',
  'matrix',
  'matrix3d',
]);

/* A grammar bounds these numbers in a way the sign class cannot decide, so a
 * different number can turn a valid declaration into an invalid one. The
 * generated list comes from webref; older browsers also accept only 100…900
 * in steps of 100 for the weights, which webref no longer states. The
 * Trident spelling of `text-combine-upright` has no unprefixed name. */
const numericRangeProperties = new Set([
  ...generatedNumericRanges,
  'font',
  'font-weight',
  '-ms-text-combine-horizontal',
]);

const knownProperties = new Set(knownPropertyNames);

/**
 * A prefixed alias shares the grammar of the standard property. A property
 * webref does not specify has no grammar to check, so its numbers stay fixed
 * rather than risk making an invalid value valid.
 *
 * @param {string} prop - lowercased
 * @return {boolean}
 */
function hasFixedNumbers(prop) {
  if (numericRangeProperties.has(prop)) return true;
  const standard = withoutVendorPrefix(prop);
  return numericRangeProperties.has(standard) || !knownProperties.has(standard);
}

/** @typedef {{ value: number, unit?: string, type?: string }} NumericData */

/**
 * @param {number} value
 * @return {number} -1, 0 or 1
 */
function signClass(value) {
  if (value < 0) return -1;
  return value > 0 ? 1 : 0;
}

/**
 * @param {CSSToken} token
 * @return {boolean} whether the hash is a hex colour of a valid length
 */
function isHexColor(token) {
  return isHexColorDigits(decoded(token));
}

/**
 * @param {string} text
 * @return {string} the text prefixed by its length, so that concatenated
 * pieces never read as one another
 */
function piece(text) {
  return `${text.length}:${text}`;
}

/**
 * A number inside a math function stays fixed: an engine may reject the later
 * value while parsing, even though the function clamps it at computed-value
 * time.
 *
 * @param {string | undefined} functionName - innermost enclosing function
 * @return {boolean} whether a number there may vary without changing validity
 */
function allowsVaryingNumbers(functionName) {
  return functionName === undefined || transformFunctions.has(functionName);
}

/**
 * Follows the number grammar of CSS Syntax 3: sign, integer part, fraction,
 * then an exponent only where `e` is followed by a digit, so the `e` of a
 * unit such as `em` or `ex` is no exponent.
 *
 * @param {string} text - the source text of a numeric token
 * @return {boolean} whether the number is in scientific notation
 */
function hasExponent(text) {
  let index = text.charCodeAt(0) === 43 || text.charCodeAt(0) === 45 ? 1 : 0;
  while (isAsciiDigit(text.charCodeAt(index))) index++;
  if (text.charCodeAt(index) === 46) {
    index++;
    while (isAsciiDigit(text.charCodeAt(index))) index++;
  }
  const code = text.charCodeAt(index);
  if (code !== 101 && code !== 69) return false;
  const next = text.charCodeAt(index + 1);
  return (
    isAsciiDigit(next) ||
    ((next === 43 || next === 45) && isAsciiDigit(text.charCodeAt(index + 2)))
  );
}

/**
 * A magnitude may change only where the unit, sign class, integer type and
 * notation decide nothing a browser checks: older parsers reject scientific
 * notation. Any two lengths share a key, so a length in a unit older browsers
 * lack is left to isFallback.
 *
 * @param {CSSToken} token - a number, percentage or dimension
 * @return {string} the part of the key that tolerates a different magnitude
 */
function magnitudeKey(token) {
  const data = /** @type {NumericData} */ (token[4]);
  const unit = asciiLowerCase(data.unit ?? '');
  // A dimension always has a unit, so the empty unit stands for any length.
  return (
    piece(String(data.type)) +
    piece(String(signClass(data.value))) +
    piece(hasExponent(token[1]) ? 'e' : '') +
    piece(lengthUnits.has(unit) ? '' : unit)
  );
}

/** Tokens that a browser compares by type alone. */
const typeOnlyTokens = new Set([TokenType.Whitespace, TokenType.Comment]);

/** Tokens that a browser compares by their exact text. */
const exactTextTokens = new Set([
  TokenType.String,
  TokenType.URL,
  TokenType.Delim,
  TokenType.Comma,
  TokenType.Colon,
  TokenType.Semicolon,
  TokenType.OpenSquare,
  TokenType.CloseSquare,
  TokenType.OpenCurly,
  TokenType.CloseCurly,
]);

/**
 * The key part of one token. Opening and closing functions update the stack
 * of enclosing functions, which decides where a number may vary.
 *
 * @param {CSSToken} token
 * @param {boolean} fixed - whether the property has fixed numbers
 * @param {(string | undefined)[]} enclosing - innermost function last
 * @return {string | undefined} undefined when the token is incomparable
 */
function tokenKey(token, fixed, enclosing) {
  const type = token[0];
  if (typeOnlyTokens.has(type)) return piece(type);
  if (exactTextTokens.has(type)) return piece(type) + piece(token[1]);
  switch (type) {
    case TokenType.Ident:
      return piece(type) + piece(asciiLowerCase(decoded(token)));
    case TokenType.Function: {
      const name = asciiLowerCase(decoded(token));
      enclosing.push(name);
      return piece(type) + piece(name);
    }
    case TokenType.OpenParen:
      enclosing.push(enclosing.at(-1));
      return piece(type) + piece(token[1]);
    case TokenType.CloseParen:
      if (enclosing.length === 0) return undefined;
      enclosing.pop();
      return piece(type);
    case TokenType.Number:
    case TokenType.Percentage:
    case TokenType.Dimension:
      return (
        piece(type) +
        (fixed || !allowsVaryingNumbers(enclosing.at(-1))
          ? piece(token[1])
          : magnitudeKey(token))
      );
    case TokenType.Hash:
      return (
        piece(type) + piece(!fixed && isHexColor(token) ? 'hex' : token[1])
      );
    default:
      // bad-string, bad-url and anything unmodelled.
      return undefined;
  }
}

/**
 * A string that two values share exactly when a browser that accepts one
 * must accept the other. Magnitudes are left out where they may vary, and
 * hex colours share a key whatever their valid length, except where the
 * property has fixed numbers.
 *
 * @param {string} value
 * @param {string} prop - lowercased
 * @param {Map<string, CSSToken[]>} [cache] - tokenization memo
 * @return {string | undefined} the key, or undefined when the value is
 * incomparable: unbalanced parentheses, a bad string or URL, or a token
 * the model does not cover
 */
export function shapeKey(value, prop, cache) {
  const fixed = hasFixedNumbers(prop);
  /** @type {(string | undefined)[]} */
  const enclosing = [];
  let key = '';
  for (const token of tokenizeMemoized(value, cache)) {
    const part = tokenKey(token, fixed, enclosing);
    if (part === undefined) return undefined;
    key += part;
  }
  return enclosing.length === 0 ? key : undefined;
}

/**
 * Older parsers reject scientific notation, so a value that uses it cannot
 * override one that does not, even where the shape is otherwise trusted.
 *
 * @param {string} value
 * @param {Map<string, CSSToken[]>} [cache] - tokenization memo
 * @return {boolean}
 */
export function hasScientificNotation(value, cache) {
  if (!mayHaveExponent(value)) return false;
  return tokenizeMemoized(value, cache).some(
    (token) =>
      (token[0] === TokenType.Number ||
        token[0] === TokenType.Percentage ||
        token[0] === TokenType.Dimension) &&
      hasExponent(token[1])
  );
}

/**
 * Skips tokenizing the common value with no digit before `e`.
 *
 * @param {string} value
 * @return {boolean}
 */
function mayHaveExponent(value) {
  for (let index = 1; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (
      (code === 101 || code === 69) &&
      isAsciiDigit(value.charCodeAt(index - 1))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * @param {string} value
 * @param {Map<string, CSSToken[]> | undefined} cache
 * @return {CSSToken[]}
 */
function tokenizeMemoized(value, cache) {
  let result = cache?.get(value);
  if (!result) {
    result = tokens(value);
    cache?.set(value, result);
  }
  return result;
}

/**
 * Whether a browser that accepts `earlierValue` for `prop` must also accept
 * `laterValue`, so the earlier declaration can never serve as a fallback.
 * Only magnitudes may differ; keywords, units and token types may not.
 *
 * @param {string} earlierValue
 * @param {string} laterValue
 * @param {string} prop
 * @param {Map<string, CSSToken[]>} [cache] - tokenization memo
 * @return {boolean}
 */
export function isShapeEquivalent(earlierValue, laterValue, prop, cache) {
  const name = asciiLowerCase(prop);
  const key = shapeKey(earlierValue, name, cache);
  return key !== undefined && key === shapeKey(laterValue, name, cache);
}
