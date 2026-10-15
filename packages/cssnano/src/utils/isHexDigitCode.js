/**
 * Whether a code point is an ASCII hex digit (CSS Syntax 3 §4.2).
 * @param {number} code
 * @return {boolean}
 */
export default function isHexDigitCode(code) {
  return (
    (code >= 0x30 && code <= 0x39) ||
    (code >= 0x41 && code <= 0x46) ||
    (code >= 0x61 && code <= 0x66)
  );
}
