import { NumberType, TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * Tokens built here have no position in a source text, so they carry -1.
 * Their representation is the text the tokenizer would read back.
 */
const noPosition = -1;

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

/**
 * An identifier token with the value given. Its text is escaped as needed.
 *
 * @param {string} value a non-empty identifier value
 * @return {CSSToken}
 */
function ident(value) {
  if (value === '') {
    throw new RangeError('An identifier token cannot have an empty value');
  }
  return /** @type {CSSToken} */ ([
    TokenType.Ident,
    serializeIdentifier(value),
    noPosition,
    noPosition,
    { value },
  ]);
}

/**
 * A `<integer>` number token. Only safe integers are accepted, so the value
 * is exact.
 *
 * @param {number} value
 * @return {CSSToken}
 */
function integer(value) {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${value} is not a safe integer`);
  }
  return /** @type {CSSToken} */ ([
    TokenType.Number,
    String(value),
    noPosition,
    noPosition,
    { value, type: NumberType.Integer },
  ]);
}

/**
 * A percentage token: a `<number>` followed by a percent sign.
 *
 * @param {number} value
 * @return {CSSToken}
 */
function percentage(value) {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${value} cannot be written as a CSS number`);
  }
  return /** @type {CSSToken} */ ([
    TokenType.Percentage,
    `${value}%`,
    noPosition,
    noPosition,
    { value },
  ]);
}

export { ident, integer, percentage };
