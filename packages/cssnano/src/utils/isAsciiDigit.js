/**
 * Whether a code point is an ASCII digit (CSS Syntax 3 §4.2).
 * @param {number} code
 * @return {boolean}
 */
export default function isAsciiDigit(code) {
  return code >= 0x30 && code <= 0x39;
}
