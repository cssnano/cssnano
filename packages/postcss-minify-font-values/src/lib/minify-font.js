import cssnanoUtils from 'cssnano-utils';
import keywords from './keywords.js';
import minifyFamily from './minify-family.js';

const {
  TokenType,
  asciiLowerCase,
  balancedTokens,
  decoded,
  lengthUnits,
  tokenEnd,
} = cssnanoUtils;

// `oblique <angle>` precedes the font-size.
const angleUnits = new Set(['deg', 'grad', 'rad', 'turn']);

/** @import {CSSToken} from '@csstools/css-tokenizer' */

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

// Functions whose result is substituted at computed-value time, so the
// shorthand cannot be split into components statically. Custom functions
// (`--name()`) are substitution functions too.
const substitutionFunctions = new Set(['var', 'env', 'attr', 'if', 'inherit']);

/** @param {CSSToken} token */
function isSubstitution(token) {
  if (token[0] !== TokenType.Function) return false;
  const name = decoded(token);
  return (
    name.startsWith('--') || substitutionFunctions.has(asciiLowerCase(name))
  );
}

/**
 * Locate the `font-size` and the tokens preceding it. Returns undefined when
 * the value cannot be minified safely (a substitution function, an unknown
 * dimension, repeated `bold`).
 *
 * @param {NonNullable<ReturnType<typeof balancedTokens>>} balanced
 * @return {{ sizeEnd: number, possibleFamilyStart: number, boldSpan?: { start: number, end: number } } | undefined}
 */
function scanFontPrefix(balanced) {
  const input = balanced.tokens;
  let possibleFamilyStart = -1;
  let sizeEnd = -1;
  /** @type {{ start: number, end: number } | undefined} */
  let boldSpan;
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
        if (boldSpan) return;
        boldSpan = { start: token[2], end: tokenEnd(token) };
      }
      possibleFamilyStart = input[skipTrivia(input, index + 1)]?.[2] ?? -1;
    } else if (isNumericWeight(token)) {
      possibleFamilyStart = input[skipTrivia(input, index + 1)]?.[2] ?? -1;
    } else if (isFontSize(token, name)) {
      sizeEnd = balanced.endForOpening(index) ?? index;
    }
  }
  return { sizeEnd, possibleFamilyStart, boldSpan };
}

/**
 * Skip an optional `/ line-height` after the font-size.
 *
 * @param {NonNullable<ReturnType<typeof balancedTokens>>} balanced
 * @param {number} sizeEnd
 * @param {number} length
 */
function familyStartAfterSize(balanced, sizeEnd, length) {
  const input = balanced.tokens;
  let next = skipTrivia(input, sizeEnd + 1);
  if (input[next]?.[0] === TokenType.Delim && input[next][1] === '/') {
    next = skipTrivia(input, next + 1);
    if (input[next]) next = (balanced.endForOpening(next) ?? next) + 1;
    next = skipTrivia(input, next);
  }
  return input[next]?.[2] ?? length;
}

/** @param {string} value @param {import('../index.js').Options} opts @return {string} */
export default function minifyFont(
  value,
  opts,
  removeQuotes = opts.removeQuotes
) {
  const balanced = balancedTokens(value);
  if (!balanced) return value;
  const scan = scanFontPrefix(balanced);
  if (!scan) return value;
  const { sizeEnd, possibleFamilyStart, boldSpan } = scan;
  const familyStart =
    sizeEnd >= 0
      ? familyStartAfterSize(balanced, sizeEnd, value.length)
      : possibleFamilyStart;
  if (familyStart < 0) return value;
  let prefix = boldSpan
    ? value.slice(0, boldSpan.start) +
      '700' +
      value.slice(boldSpan.end, familyStart)
    : value.slice(0, familyStart);
  if (familyStart < value.length && !prefix.endsWith(' ') && prefix)
    prefix += ' ';
  return prefix + minifyFamily(value.slice(familyStart), opts, removeQuotes);
}
