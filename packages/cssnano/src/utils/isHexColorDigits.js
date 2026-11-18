import isHexDigitCode from './isHexDigitCode.js';

/**
 * @param {string} digits the text after the `#` of a hash
 * @return {boolean} whether it has the length of a hex colour (3, 4, 6 or 8)
 *   and only hexadecimal digits (CSS Color 4 §5.2)
 */
export default function isHexColorDigits(digits) {
  const { length } = digits;
  if (length !== 3 && length !== 4 && length !== 6 && length !== 8) {
    return false;
  }
  for (let index = 0; index < length; index++) {
    if (!isHexDigitCode(digits.charCodeAt(index))) return false;
  }
  return true;
}
