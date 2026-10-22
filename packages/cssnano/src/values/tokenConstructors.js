import { NumberType, TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * Numbers below this magnitude are written without an exponent, so the
 * tokenizer reads a whole number as an integer.
 */
const PLAIN_NUMBER_LIMIT = 1e21;

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
 * A unit that starts with `e` and a digit, optionally after a sign, would be
 * read as the exponent of the number before it. Its first letter is escaped.
 *
 * @param {string} unit
 * @return {string}
 */
function serializeUnit(unit) {
  const first = unit[0];
  if (first === 'e' || first === 'E') {
    let rest = unit.slice(1);
    if (rest[0] === '+' || rest[0] === '-') rest = rest.slice(1);
    if (isDigitCharacter(rest[0])) {
      return `${hexEscape(first.codePointAt(0) ?? 0)}${serializeIdentifier(unit.slice(1))}`;
    }
  }
  return serializeIdentifier(unit);
}

/**
 * A `<number>` written as the text the tokenizer reads back as the same value.
 *
 * @param {number} value
 * @return {{ text: string, type: NumberType }}
 */
function numberText(value) {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${value} cannot be written as a CSS number`);
  }
  const type =
    Number.isInteger(value) && Math.abs(value) < PLAIN_NUMBER_LIMIT
      ? NumberType.Integer
      : NumberType.Number;
  return { text: String(value), type };
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
 * A `<number>` token. Any finite value is accepted; the token's type is
 * `integer` exactly when its text reads back as an integer.
 *
 * @param {number} value
 * @return {CSSToken}
 */
function number(value) {
  const { text, type } = numberText(value);
  return /** @type {CSSToken} */ ([
    TokenType.Number,
    text,
    noPosition,
    noPosition,
    { value, type },
  ]);
}

/**
 * A dimension token: a `<number>` followed by a unit.
 *
 * @param {number} value
 * @param {string} unit a non-empty identifier
 * @return {CSSToken}
 */
function dimension(value, unit) {
  if (unit === '') {
    throw new RangeError('A dimension token needs a unit');
  }
  const { text, type } = numberText(value);
  return /** @type {CSSToken} */ ([
    TokenType.Dimension,
    `${text}${serializeUnit(unit)}`,
    noPosition,
    noPosition,
    { value, type, unit },
  ]);
}

/**
 * A whitespace token, written as a single space.
 *
 * @return {CSSToken}
 */
function whitespace() {
  return /** @type {CSSToken} */ ([
    TokenType.Whitespace,
    ' ',
    noPosition,
    noPosition,
    undefined,
  ]);
}

export { dimension, ident, integer, number, whitespace };
