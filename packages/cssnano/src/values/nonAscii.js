// eslint-disable-next-line no-control-regex
const nonAscii = /[^\x00-\x7F]/v;

/**
 * Whether text holds a character outside ASCII, which a stylesheet needs an
 * encoding for.
 *
 * @param {string} text
 * @return {boolean}
 */
export function holdsNonAscii(text) {
  return nonAscii.test(text);
}
