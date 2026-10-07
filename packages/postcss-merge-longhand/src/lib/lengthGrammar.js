import cssnanoUtils from 'cssnano-utils';
import { isAsciiDigit } from './asciiCharacters.js';

const { lengthUnits } = cssnanoUtils;

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
 * Splits a whole token into its number and unit, following the number grammar
 * of CSS Syntax 3: an exponent counts only where `e` is followed by a digit,
 * so the `e` of `em` starts a unit.
 *
 * @param {string} text - lowercased, as spelled in the stylesheet
 * @return {{number: number, unit: string} | undefined} the unit is `''` for a
 * bare number and `'%'` for a percentage; `undefined` for anything else
 */
export function parseDimension(text) {
  const sign = text.charCodeAt(0);
  const integerStart = sign === 43 || sign === 45 ? 1 : 0;
  const integerEnd = skipDigits(text, integerStart);
  let end = integerEnd;
  if (text.charCodeAt(end) === 46 && isAsciiDigit(text.charCodeAt(end + 1))) {
    end = skipDigits(text, end + 1);
  }
  if (end === integerStart) return undefined;

  if (text.charCodeAt(end) === 101) {
    const exponentSign = text.charCodeAt(end + 1);
    const digitsStart =
      end + (exponentSign === 43 || exponentSign === 45 ? 2 : 1);
    if (isAsciiDigit(text.charCodeAt(digitsStart))) {
      end = skipDigits(text, digitsStart);
    }
  }

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
  return lengthUnits.has(unit.toLowerCase());
}
