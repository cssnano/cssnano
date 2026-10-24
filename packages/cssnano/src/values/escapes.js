/**
 * The CSS escapes that let a value be written inside an unquoted url token or
 * a string token. Each escape reads back as the character it replaces.
 */

// Characters that end or break an unquoted url token. The escapes below
// write each as a backslash and the character, or a hex escape for a line break.
// eslint-disable-next-line no-useless-escape
const urlTokenEscapeChars = /[\\ \t\n\r\f\(\)"']/gv;

/**
 * Writes a character as a CSS escape, the way a string or url token reads back.
 *
 * @param {string} match
 * @return {string}
 */
function replaceEscapeChar(match) {
  switch (match) {
    case '\n':
      return '\\a ';
    case '\r':
      return '\\d ';
    case '\f':
      return '\\c ';
    default:
      return '\\' + match;
  }
}

/**
 * Escapes the characters that would end an unquoted url token.
 *
 * @param {string} value
 * @return {string}
 */
function escapeForUrlToken(value) {
  return value.replaceAll(urlTokenEscapeChars, replaceEscapeChar);
}

export { escapeForUrlToken, replaceEscapeChar };
