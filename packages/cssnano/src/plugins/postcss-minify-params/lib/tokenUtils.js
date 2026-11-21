import cssnanoUtils from '#utils';

const { TokenType, isTrivia, skipTrivia } = cssnanoUtils;
const decoded = /** @type {typeof cssnanoUtils.decoded} */ (
  cssnanoUtils.decoded
);

/** @typedef {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens']} Tokens */

export { TokenType, decoded, isTrivia, skipTrivia };

export const openingTypes = new Set([
  TokenType.Function,
  TokenType.OpenParen,
  TokenType.OpenSquare,
  TokenType.OpenCurly,
]);
export const closingTypes = new Set([
  TokenType.CloseParen,
  TokenType.CloseSquare,
  TokenType.CloseCurly,
]);
export const calcProductEndTypes = new Set([
  TokenType.Number,
  TokenType.Percentage,
  TokenType.Dimension,
  TokenType.Ident,
  TokenType.CloseParen,
]);
export const calcProductStartTypes = new Set([
  TokenType.Number,
  TokenType.Percentage,
  TokenType.Dimension,
  TokenType.Ident,
  TokenType.Function,
  TokenType.OpenParen,
]);
export const mathFunctions = cssnanoUtils.mathFunctions;
export const whitespaceInsensitiveFunctions = new Set(['selector']);
export const aspectRatioFeatures = new Set([
  'aspect-ratio',
  'min-aspect-ratio',
  'max-aspect-ratio',
  'device-aspect-ratio',
  'min-device-aspect-ratio',
  'max-device-aspect-ratio',
]);

/**
 * Convert a CSS number spelling to an exact rational number.
 *
 * @param {string} source
 * @return {[bigint, bigint] | undefined}
 */
export function rational(source) {
  const match = source.match(
    /^[+]?((?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE]([+\-]?\d+))?$/v
  );
  if (!match) return undefined;
  const [, coefficient, exponent = '0'] = match;
  const [whole, fraction = ''] = coefficient.split('.');
  const digits = `${whole}${fraction}`;
  let numerator = BigInt(digits);
  let denominator = 10n ** BigInt(fraction.length);
  if (numerator === 0n) return [0n, 1n];
  const power = BigInt(exponent);
  if (power > 10000n || power < -10000n) return undefined;
  if (power >= 0n) numerator *= 10n ** power;
  else denominator *= 10n ** -power;
  return [numerator, denominator];
}

/** @param {bigint} a @param {bigint} b @return {bigint} */
function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

/**
 * @param {string} left
 * @param {string} right
 * @return {[string, string] | undefined}
 */
export function aspectRatio(left, right) {
  const a = rational(left);
  const b = rational(right);
  if (!a || !b) return undefined;
  const numerator = a[0] * b[1];
  const denominator = b[0] * a[1];
  if (numerator === 0n && denominator === 0n) return undefined;
  const divisor = gcd(numerator, denominator);
  const result = [String(numerator / divisor), String(denominator / divisor)];
  return result.join('/').length < left.length + right.length + 1
    ? /** @type {[string, string]} */ (result)
    : undefined;
}

/**
 * The nearest token at or before `index` that is not whitespace or a comment,
 * or -1 when there is none.
 *
 * @param {Tokens} input
 * @param {number} index
 * @return {number}
 */
export function previousSignificantIndex(input, index) {
  let cursor = index;
  while (isTrivia(input[cursor])) cursor--;
  return cursor;
}

/**
 * Where the value of a `(name: value)` feature starts, for the `(` at `open`;
 * the name is the first significant token after it. Returns -1 unless an
 * identifier and a colon open the feature.
 *
 * @param {Tokens} input
 * @param {number} open
 * @return {number} the index of the first significant token after the colon
 */
export function featureValueIndex(input, open) {
  const name = skipTrivia(input, open + 1);
  if (input[name]?.[0] !== TokenType.Ident) return -1;
  const colon = skipTrivia(input, name + 1);
  if (input[colon]?.[0] !== TokenType.Colon) return -1;
  return skipTrivia(input, colon + 1);
}
