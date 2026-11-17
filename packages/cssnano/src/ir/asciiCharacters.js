/**
 * @param {number} code - a UTF-16 code unit
 * @return {boolean}
 */
export function isAsciiDigit(code) {
  return code >= 48 && code <= 57;
}

/**
 * @param {string} digits - the text after the `#` of a hash
 * @return {boolean} whether it has the length of a hex colour (3, 4, 6 or 8)
 * and only hexadecimal digits
 */
export function isHexColorDigits(digits) {
  const { length } = digits;
  if (length !== 3 && length !== 4 && length !== 6 && length !== 8) {
    return false;
  }
  for (let index = 0; index < length; index++) {
    const code = digits.charCodeAt(index);
    const isLower = code >= 97 && code <= 102;
    const isUpper = code >= 65 && code <= 70;
    if (!isAsciiDigit(code) && !isLower && !isUpper) return false;
  }
  return true;
}
