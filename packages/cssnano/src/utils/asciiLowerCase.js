/* CSS keyword matching is ASCII-case-insensitive; avoid Unicode case folding
 * and the replacement callback on the overwhelmingly common lowercase path. */
const asciiUpperCase = /[A-Z]/v;

/** @param {string} value @return {string} */
export default function asciiLowerCase(value) {
  if (!asciiUpperCase.test(value)) return value;
  return value.replaceAll(/[A-Z]/gv, (character) => character.toLowerCase());
}
