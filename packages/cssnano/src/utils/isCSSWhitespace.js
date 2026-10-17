/**
 * Whether a code point is CSS whitespace: space, tab, line feed, carriage
 * return or form feed. JavaScript `\s` also matches characters such as
 * no-break space, which CSS treats as part of an identifier.
 * @param {number} code
 * @return {boolean}
 */
export default function isCSSWhitespace(code) {
  return (
    code === 0x20 ||
    code === 0x09 ||
    code === 0x0a ||
    code === 0x0c ||
    code === 0x0d
  );
}
