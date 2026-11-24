/**
 * Whether a code point is a CSS newline: line feed, carriage return or form
 * feed. A backslash before one of them is an invalid escape, not a valid one.
 * @param {number} code
 * @return {boolean}
 */
export default function isCSSNewline(code) {
  return code === 0x0a || code === 0x0d || code === 0x0c;
}
