import { HashType, NumberType, TokenType } from '@csstools/css-tokenizer';
import {
  escapeForUrlToken,
  hexEscape,
  isDigitCharacter,
  isLetterCharacter,
  serializeIdentifier,
} from './escapes.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * Tokens built here have no position in a source text, so they carry -1.
 * Their representation is the text the tokenizer would read back.
 */
const noPosition = -1;

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
 * An identifier token with the text and value given. Use it when the text
 * is already spelled, such as an escaped name, and must be kept as it is.
 *
 * @param {string} text a spelling the tokenizer reads as one identifier
 * @param {string} value the value that spelling decodes to
 * @return {CSSToken}
 */
function identifierWithText(text, value) {
  return /** @type {CSSToken} */ ([
    TokenType.Ident,
    text,
    noPosition,
    noPosition,
    { value },
  ]);
}

/**
 * A function token whose text, including its `(`, is given. Use it when the
 * name is already spelled, such as a pseudo-class name with an escape that
 * must be kept as it is.
 *
 * @param {string} text a spelling the tokenizer reads as one function token
 * @param {string} value the name that spelling decodes to
 * @return {CSSToken}
 */
function funcWithText(text, value) {
  return /** @type {CSSToken} */ ([
    TokenType.Function,
    text,
    noPosition,
    noPosition,
    { value },
  ]);
}

/** @param {string} text @param {number} index @return {number} */
function skipDigits(text, index) {
  let next = index;
  while (isDigitCharacter(text[next])) {
    next++;
  }
  return next;
}

/**
 * Whether `text` is a CSS `<number>`: an optional sign, digits with an
 * optional fraction, and an optional exponent. One scan, no regular
 * expression.
 *
 * @param {string} text
 * @return {boolean}
 */
function isNumberText(text) {
  let index = 0;
  if (text[index] === '+' || text[index] === '-') {
    index++;
  }
  const integerStart = index;
  index = skipDigits(text, index);
  let hasDigits = index > integerStart;
  if (text[index] === '.') {
    const fractionStart = index + 1;
    index = skipDigits(text, fractionStart);
    if (index === fractionStart) {
      return false;
    }
    hasDigits = true;
  }
  if (!hasDigits) {
    return false;
  }
  if (text[index] === 'e' || text[index] === 'E') {
    index++;
    if (text[index] === '+' || text[index] === '-') {
      index++;
    }
    const exponentStart = index;
    index = skipDigits(text, index);
    if (index === exponentStart) {
      return false;
    }
  }
  return index === text.length;
}

/**
 * Writes a unit so the number before it does not read as an exponent. A
 * unit such as `e3` or `E-3` gets its first letter hex-escaped.
 *
 * @param {string} unit a non-empty unit
 * @return {string}
 */
function unitText(unit) {
  const text = serializeIdentifier(unit);
  const first = text[0];
  const second = text[1];
  const third = text[2];
  const startsExponent =
    (first === 'e' || first === 'E') &&
    (isDigitCharacter(second) ||
      ((second === '+' || second === '-') && isDigitCharacter(third)));
  return startsExponent
    ? hexEscape(text.codePointAt(0) ?? 0) + text.slice(1)
    : text;
}

/**
 * A `<number>` token, a `<percentage>` token for unit `%`, or a
 * `<dimension>` token otherwise. The representation is kept as written.
 *
 * @param {string} representation a CSS `<number>`, such as `+1.50e1`
 * @param {string} [unit] an empty string for a plain number
 * @return {CSSToken}
 */
function numeric(representation, unit = '') {
  if (!isNumberText(representation)) {
    throw new RangeError(`${representation} is not a CSS number`);
  }
  /** @type {{value: number, signCharacter?: string, type?: NumberType, unit?: string}} */
  const data = { value: Number(representation) };
  const sign = representation[0];
  if (sign === '+' || sign === '-') {
    data.signCharacter = sign;
  }
  if (unit === '%') {
    return /** @type {CSSToken} */ ([
      TokenType.Percentage,
      `${representation}%`,
      noPosition,
      noPosition,
      data,
    ]);
  }
  const isNumberSpelling =
    representation.includes('.') ||
    representation.includes('e') ||
    representation.includes('E');
  data.type = isNumberSpelling ? NumberType.Number : NumberType.Integer;
  if (unit === '') {
    return /** @type {CSSToken} */ ([
      TokenType.Number,
      representation,
      noPosition,
      noPosition,
      data,
    ]);
  }
  return /** @type {CSSToken} */ ([
    TokenType.Dimension,
    `${representation}${unitText(unit)}`,
    noPosition,
    noPosition,
    { ...data, unit },
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
  /** @type {{value: number, signCharacter?: string, type: NumberType}} */
  const data = { value, type: NumberType.Integer };
  if (value < 0) {
    data.signCharacter = '-';
  }
  return /** @type {CSSToken} */ ([
    TokenType.Number,
    String(value),
    noPosition,
    noPosition,
    data,
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

/**
 * A string token with the text given, a quoted CSS string, and the value it
 * decodes to. The text is the caller's, so it is not checked for escapes.
 *
 * @param {string} text
 * @param {string} value
 * @return {CSSToken}
 */
function stringToken(text, value) {
  const quote = text[0];
  if (
    text.length < 2 ||
    (quote !== '"' && quote !== "'") ||
    text[text.length - 1] !== quote
  ) {
    throw new RangeError(`${text} is not a quoted CSS string`);
  }
  return /** @type {CSSToken} */ ([
    TokenType.String,
    text,
    noPosition,
    noPosition,
    { value },
  ]);
}

/**
 * An unquoted url token, `name(value)`, with the name as written.
 * @param {string} value the decoded URL, possibly empty
 * @param {string} [name] `url` in any case
 * @return {CSSToken}
 */
function url(value, name = 'url') {
  return /** @type {CSSToken} */ ([
    TokenType.URL,
    `${name}(${escapeForUrlToken(value)})`,
    noPosition,
    noPosition,
    { value },
  ]);
}

/** @param {string | undefined} character @return {boolean} */
function isNameCharacter(character) {
  return (
    isDigitCharacter(character) ||
    (character !== undefined && isLetterCharacter(character)) ||
    character === '-' ||
    character === '_' ||
    (character?.codePointAt(0) ?? 0) >= 0x80
  );
}

/** @param {string | undefined} character @return {boolean} */
function isIdentStartCharacter(character) {
  return (
    (character !== undefined && isLetterCharacter(character)) ||
    character === '_' ||
    (character?.codePointAt(0) ?? 0) >= 0x80
  );
}

/**
 * A hash token, `#name`. Its type is id when the name would start an
 * identifier, and unrestricted otherwise, as the tokenizer reads it.
 *
 * @param {string} value a non-empty name of letters, digits, hyphens,
 *   underscores and non-ASCII characters
 * @return {CSSToken}
 */
function hash(value) {
  const characters = [...value];
  if (characters.length === 0 || !characters.every(isNameCharacter)) {
    throw new RangeError(`${value} is not a hash name`);
  }
  const [first, second] = characters;
  const startsIdent =
    isIdentStartCharacter(first) ||
    (first === '-' && (isIdentStartCharacter(second) || second === '-'));
  return /** @type {CSSToken} */ ([
    TokenType.Hash,
    `#${value}`,
    noPosition,
    noPosition,
    { value, type: startsIdent ? HashType.ID : HashType.Unrestricted },
  ]);
}

/**
 * A function token, `name(`. The name is written as an identifier is, so it
 * reads back with the same value.
 *
 * @param {string} name a non-empty function name
 * @return {CSSToken}
 */
function func(name) {
  const [, text, , , data] = ident(name);
  return /** @type {CSSToken} */ ([
    TokenType.Function,
    `${text}(`,
    noPosition,
    noPosition,
    data,
  ]);
}

/**
 * A hash token whose text is given. Use it when the text is already spelled,
 * such as an ID with an escape that must be kept as it is.
 *
 * @param {string} text a spelling the tokenizer reads as one hash token
 * @param {string} value the name that spelling decodes to
 * @param {'id' | 'unrestricted'} type
 * @return {CSSToken}
 */
function hashWithText(text, value, type) {
  return /** @type {CSSToken} */ ([
    TokenType.Hash,
    text,
    noPosition,
    noPosition,
    { value, type },
  ]);
}

export {
  func,
  funcWithText,
  hash,
  hashWithText,
  ident,
  identifierWithText,
  integer,
  numeric,
  percentage,
  stringToken,
  url,
};
