/**
 * The CSS escapes that let a value be written inside an unquoted url token, a
 * string token or an identifier. Each escape reads back as the character it
 * replaces.
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

/** @param {string | undefined} character @return {boolean} */
function isDigitCharacter(character) {
  return character !== undefined && character >= '0' && character <= '9';
}

/** @param {string} character @return {boolean} */
function isLetterCharacter(character) {
  return (
    (character >= 'a' && character <= 'z') ||
    (character >= 'A' && character <= 'Z')
  );
}

/** @param {number} codePoint @return {string} */
function hexEscape(codePoint) {
  return `\\${codePoint.toString(16)} `;
}

/**
 * Writes an identifier so the tokenizer reads it back as one identifier with
 * the same value. Follows CSSOM's "serialize an identifier".
 *
 * @param {string} value
 * @return {string}
 */
function serializeIdentifier(value) {
  const characters = [...value];
  let text = '';
  for (let index = 0; index < characters.length; index++) {
    const character = characters[index];
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint === 0) {
      text += '�';
    } else if (
      codePoint <= 0x1f ||
      codePoint === 0x7f ||
      (isDigitCharacter(character) &&
        (index === 0 || (index === 1 && characters[0] === '-')))
    ) {
      text += hexEscape(codePoint);
    } else if (index === 0 && characters.length === 1 && character === '-') {
      text += '\\-';
    } else if (
      codePoint >= 0x80 ||
      character === '-' ||
      character === '_' ||
      isDigitCharacter(character) ||
      isLetterCharacter(character)
    ) {
      text += character;
    } else {
      text += `\\${character}`;
    }
  }
  return text;
}

export {
  escapeForUrlToken,
  hexEscape,
  isDigitCharacter,
  isLetterCharacter,
  replaceEscapeChar,
  serializeIdentifier,
};
