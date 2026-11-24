import cssnanoUtils from '#utils';

const { asciiLowerCase, isAsciiDigit, lengthUnits } = cssnanoUtils;

/**
 * @param {string} text
 * @param {number} index
 * @return {number} the index after the digits that start at `index`
 */
function skipDigits(text, index) {
  let end = index;
  while (isAsciiDigit(text.charCodeAt(end))) end++;
  return end;
}

/**
 * Scans the sign, integer digits and fraction at the start of a token, where a
 * fraction needs a digit after its dot.
 *
 * @param {string} text
 * @return {number} the index just past the digits, or -1 when no digit starts
 * the number
 */
function scanMantissa(text) {
  const sign = text.charCodeAt(0);
  const integerStart = sign === 43 || sign === 45 ? 1 : 0;
  let end = skipDigits(text, integerStart);
  if (text.charCodeAt(end) === 46 && isAsciiDigit(text.charCodeAt(end + 1))) {
    end = skipDigits(text, end + 1);
  }
  return end === integerStart ? -1 : end;
}

/**
 * Scans an exponent at `index`, which an exponent takes only where `e` or `E`
 * is followed by a digit, so the `e` of `em` is no exponent.
 *
 * @param {string} text
 * @param {number} index the index just past the mantissa
 * @return {number} the index just past the exponent, or `index` when there is
 * none
 */
function scanExponent(text, index) {
  const marker = text.charCodeAt(index);
  if (marker !== 101 && marker !== 69) return index;
  const exponentSign = text.charCodeAt(index + 1);
  const digitsStart =
    index + (exponentSign === 43 || exponentSign === 45 ? 2 : 1);
  return isAsciiDigit(text.charCodeAt(digitsStart))
    ? skipDigits(text, digitsStart)
    : index;
}

/**
 * Scans the number at the start of a token, following the number grammar of
 * CSS Syntax 3.
 *
 * @param {string} text
 * @return {number} the index just past the number, or -1 when no digit starts
 * the number
 */
export function scanNumber(text) {
  const end = scanMantissa(text);
  return end === -1 ? -1 : scanExponent(text, end);
}

/**
 * @param {string} text
 * @return {boolean} whether the number at the start of the token is in
 * scientific notation
 */
export function hasExponent(text) {
  const end = scanMantissa(text);
  return end !== -1 && scanExponent(text, end) !== end;
}

/**
 * Splits a whole token into its number and unit, following the number grammar
 * of CSS Syntax 3 through scanNumber.
 *
 * @param {string} text - lowercased, as spelled in the stylesheet
 * @return {{number: number, unit: string} | undefined} the unit is `''` for a
 * bare number and `'%'` for a percentage; `undefined` for anything else
 */
export function parseDimension(text) {
  const end = scanNumber(text);
  if (end === -1) return undefined;
  const unit = text.slice(end);
  if (unit !== '%') {
    for (let index = 0; index < unit.length; index++) {
      const code = unit.charCodeAt(index);
      if (code < 97 || code > 122) return undefined;
    }
  }
  return { number: Number(text.slice(0, end)), unit };
}

/**
 * Whether a number and unit form a `<length>`, or a `<length-percentage>` where
 * a percentage is allowed. Only zero may go without a unit, and a unit must
 * be a length unit of CSS Values 4.
 *
 * @param {number} number - signed, so that `-0` is told from `0`
 * @param {string} unit - `''` for a bare number, `'%'` for a percentage
 * @param {boolean} percentage - whether a percentage is allowed
 * @param {boolean} nonNegative - whether the grammar bounds the range at zero;
 * a negative zero then counts as negative, which keeps its spelling
 * @return {boolean}
 */
export function isLengthValue(number, unit, percentage, nonNegative) {
  if (nonNegative && (number < 0 || Object.is(number, -0))) return false;
  if (unit === '') return number === 0;
  if (unit === '%') return percentage;
  return lengthUnits.has(asciiLowerCase(unit));
}
