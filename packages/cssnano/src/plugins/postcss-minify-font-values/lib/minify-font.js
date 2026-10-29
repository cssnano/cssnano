import cssnanoUtils from '#utils';
import keywords from './keywords.js';
import { minifyFamilyTokens } from './minify-family.js';
import { balancedStructure } from '../../../utils/value.js';
import { integer } from '../../../values/tokenConstructors.js';
import { whitespace } from '../../../values/punctuationTokens.js';
import { tokensText } from '../../../values/tokensText.js';

const {
  TokenType,
  asciiLowerCase,
  decoded,
  isSubstitutionFunction,
  lengthUnits,
} = cssnanoUtils;

// `oblique <angle>` precedes the font-size.
const angleUnits = new Set(['deg', 'grad', 'rad', 'turn']);

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Options} from '../index.js' */
/** @typedef {NonNullable<ReturnType<typeof balancedStructure>>} BalancedTokens */

/** @param {string} name */
const isPrefixKeyword = (name) =>
  keywords.style.has(name) ||
  keywords.variant.has(name) ||
  keywords.stretch.has(name) ||
  keywords.weight.has(name);

/** @param {CSSToken} token @param {string} name */
function isFontSize(token, name) {
  switch (token[0]) {
    case TokenType.Ident:
      return keywords.size.has(name);
    case TokenType.Number:
      return Number(decoded(token)) === 0;
    case TokenType.Percentage:
    case TokenType.Function:
      return true;
    case TokenType.Dimension:
      return lengthUnits.has(asciiLowerCase(token[4].unit));
    default:
      return false;
  }
}

/** @param {CSSToken} token */
function isUnknownDimension(token) {
  if (token[0] !== TokenType.Dimension) return false;
  const unit = asciiLowerCase(token[4].unit);
  return !lengthUnits.has(unit) && !angleUnits.has(unit);
}

/** @param {CSSToken} token */
function isNumericWeight(token) {
  if (token[0] !== TokenType.Number) return false;
  const weight = Number(decoded(token));
  return weight >= 1 && weight <= 1000;
}

/** @param {readonly CSSToken[]} input @param {number} start @return {number} */
function skipTrivia(input, start) {
  let index = start;
  while (
    input[index]?.[0] === TokenType.Whitespace ||
    input[index]?.[0] === TokenType.Comment
  )
    index++;
  return index;
}

/** @param {CSSToken} token */
function isSubstitution(token) {
  if (token[0] !== TokenType.Function) return false;
  return isSubstitutionFunction(asciiLowerCase(decoded(token)));
}

/**
 * Locate the `font-size` and the tokens preceding it. Returns undefined when
 * the value cannot be minified safely (a substitution function, an unknown
 * dimension, repeated `bold`). Indexes are token indexes.
 *
 * @param {BalancedTokens} balanced
 * @return {{ sizeEnd: number, possibleFamilyStart: number, boldIndex?: number } | undefined}
 */
function scanFontPrefix(balanced) {
  const input = balanced.tokens;
  let possibleFamilyStart = -1;
  let sizeEnd = -1;
  /** @type {number | undefined} */
  let boldIndex;
  for (let index = 0; index < input.length; index++) {
    const token = input[index];
    if (isSubstitution(token)) return;
    if (sizeEnd >= 0) continue;
    if (token[0] === TokenType.Whitespace || token[0] === TokenType.Comment)
      continue;
    // Locating the family from a dimension that is neither a font-size nor
    // an oblique angle would guess at its position.
    if (isUnknownDimension(token)) return;
    const name =
      token[0] === TokenType.Ident ? asciiLowerCase(decoded(token)) : '';
    if (token[0] === TokenType.Ident && isPrefixKeyword(name)) {
      if (name === 'bold') {
        if (boldIndex !== undefined) return;
        boldIndex = index;
      }
      possibleFamilyStart = nextTokenIndex(input, index + 1);
    } else if (isNumericWeight(token)) {
      possibleFamilyStart = nextTokenIndex(input, index + 1);
    } else if (isFontSize(token, name)) {
      sizeEnd = balanced.endForOpening(index) ?? index;
    }
  }
  return { sizeEnd, possibleFamilyStart, boldIndex };
}

/**
 * The index of the first token after `start` that is not a space or a
 * comment, or -1 when there is none.
 *
 * @param {readonly CSSToken[]} input
 * @param {number} start
 * @return {number}
 */
function nextTokenIndex(input, start) {
  const index = skipTrivia(input, start);
  return index < input.length ? index : -1;
}

/**
 * Skip an optional `/ line-height` after the font-size.
 *
 * @param {BalancedTokens} balanced
 * @param {number} sizeEnd
 * @return {number} the index of the family, or the token count when none
 */
function familyStartAfterSize(balanced, sizeEnd) {
  const input = balanced.tokens;
  let next = skipTrivia(input, sizeEnd + 1);
  if (input[next]?.[0] === TokenType.Delim && input[next][1] === '/') {
    next = skipTrivia(input, next + 1);
    if (input[next]) next = (balanced.endForOpening(next) ?? next) + 1;
    next = skipTrivia(input, next);
  }
  return next;
}

/**
 * The font shorthand as tokens, minified. The list is unchanged when the
 * font-size cannot be found safely.
 *
 * @param {readonly CSSToken[]} input
 * @param {Options} opts
 * @param {Options['removeQuotes']} [removeQuotes]
 * @return {CSSToken[]}
 */
function minifyFontTokens(input, opts, removeQuotes = opts.removeQuotes) {
  const balanced = balancedStructure(input);
  if (!balanced) return [...input];
  const scan = scanFontPrefix(balanced);
  if (!scan) return [...input];
  const { sizeEnd, possibleFamilyStart, boldIndex } = scan;
  const familyStart =
    sizeEnd >= 0
      ? familyStartAfterSize(balanced, sizeEnd)
      : possibleFamilyStart;
  if (familyStart < 0) return [...input];
  /** @type {CSSToken[]} */
  const result = [];
  for (let index = 0; index < familyStart; index++) {
    result.push(index === boldIndex ? integer(700) : input[index]);
  }
  if (
    familyStart > 0 &&
    familyStart < input.length &&
    !input[familyStart - 1][1].endsWith(' ')
  ) {
    result.push(whitespace());
  }
  for (const token of minifyFamilyTokens(
    input.slice(familyStart),
    opts,
    removeQuotes
  )) {
    result.push(token);
  }
  return result;
}

/**
 * @param {string} value
 * @param {Options} opts
 * @param {Options['removeQuotes']} [removeQuotes]
 * @return {string}
 */
function minifyFont(value, opts, removeQuotes = opts.removeQuotes) {
  return tokensText(
    minifyFontTokens(cssnanoUtils.tokens(value), opts, removeQuotes)
  );
}

export default minifyFont;
export { minifyFontTokens };
