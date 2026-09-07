import cssnanoUtils from 'cssnano-utils';

/** @typedef {import('./tokenUtils.js').CSSToken} CSSToken */

const { TokenType } = cssnanoUtils;

/** @param {string} value */
function asciiLowercase(value) {
  let result = '';
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    result +=
      code >= 0x41 && code <= 0x5a
        ? String.fromCodePoint(code + 0x20)
        : character;
  }
  return result;
}

/** @param {string} character */
function isDigit(character) {
  const code = character.codePointAt(0) ?? -1;
  return code >= 0x30 && code <= 0x39;
}

/**
 * Read an integer from its source spelling instead of the token's IEEE-754
 * numeric value. The returned end offset separates a dimension's number from
 * its unit.
 * @param {CSSToken} token
 * @return {{ end: number, signed: boolean, isOne: boolean, isTwo: boolean } | undefined}
 */
function integerTokenValue(token) {
  if (
    (token[0] !== TokenType.Number && token[0] !== TokenType.Dimension) ||
    /** @type {{type?: string}} */ (token[4])?.type !== 'integer'
  ) {
    return undefined;
  }

  const raw = token[1];
  let index = 0;
  const signed = raw[index] === '+' || raw[index] === '-';
  const negative = raw[index] === '-';
  if (signed) index++;
  const digitsStart = index;
  let firstNonZero = -1;
  while (index < raw.length && isDigit(raw[index])) {
    if (firstNonZero < 0 && raw[index] !== '0') firstNonZero = index;
    index++;
  }
  if (index === digitsStart) return undefined;
  if (token[0] === TokenType.Number && index !== raw.length) return undefined;
  const significantDigits = index - firstNonZero;
  return {
    end: index,
    signed,
    isOne: !negative && significantDigits === 1 && raw[firstNonZero] === '1',
    isTwo: !negative && significantDigits === 1 && raw[firstNonZero] === '2',
  };
}

/** @param {CSSToken} token */
function decodedIdent(token) {
  return asciiLowercase(
    /** @type {{value?: string}} */ (token[4])?.value ?? token[1]
  );
}

/** @param {CSSToken} token */
function decodedUnit(token) {
  return asciiLowercase(/** @type {{unit?: string}} */ (token[4])?.unit ?? '');
}

/** @param {string} value @param {number} start */
function decimalSuffixIsOne(value, start) {
  if (start >= value.length) return undefined;
  let firstNonZero = -1;
  for (let index = start; index < value.length; index++) {
    if (!isDigit(value[index])) return undefined;
    if (firstNonZero < 0 && value[index] !== '0') firstNonZero = index;
  }
  return value.length - firstNonZero === 1 && value[firstNonZero] === '1';
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} left
 * @param {number} right
 */
function hasWhitespaceBetween(tokens, left, right) {
  for (let index = left + 1; index < right; index++) {
    if (tokens[index][0] === TokenType.Whitespace) return true;
  }
  return false;
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {readonly number[]} significant
 * @return {{ aIsTwo: boolean, cursor: number, unit: string } | undefined}
 */
function parseNHead(tokens, significant) {
  let cursor = 0;
  let token = tokens[significant[cursor]];
  if (token[0] === TokenType.Dimension) {
    const integer = integerTokenValue(token);
    if (!integer) return undefined;
    return { aIsTwo: integer.isTwo, cursor: 1, unit: decodedUnit(token) };
  }

  const hasLeadingPlus = token[0] === TokenType.Delim && token[1] === '+';
  if (hasLeadingPlus) {
    const identIndex = significant[cursor + 1];
    if (
      identIndex === undefined ||
      hasWhitespaceBetween(tokens, significant[cursor], identIndex)
    ) {
      return undefined;
    }
    cursor++;
    token = tokens[identIndex];
  }
  if (token[0] !== TokenType.Ident) return undefined;
  let unit = decodedIdent(token);
  const aIsTwo = false;
  if (unit.startsWith('-n')) {
    if (hasLeadingPlus) return undefined;
    unit = unit.slice(1);
  }
  return { aIsTwo, cursor: cursor + 1, unit };
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {readonly number[]} significant
 * @param {number} cursor
 * @param {boolean} aIsTwo
 * @return {boolean | undefined}
 */
function parseSeparatedOffset(tokens, significant, cursor, aIsTwo) {
  if (cursor === significant.length) return false;
  const token = tokens[significant[cursor]];
  if (token[0] === TokenType.Number) {
    const integer = integerTokenValue(token);
    return integer && integer.signed && cursor + 1 === significant.length
      ? aIsTwo && integer.isOne
      : undefined;
  }
  if (token[0] !== TokenType.Delim || (token[1] !== '+' && token[1] !== '-')) {
    return undefined;
  }
  const integerIndex = significant[cursor + 1];
  if (integerIndex === undefined || cursor + 2 !== significant.length) {
    return undefined;
  }
  const integer = integerTokenValue(tokens[integerIndex]);
  return integer && !integer.signed
    ? aIsTwo && token[1] === '+' && integer.isOne
    : undefined;
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {readonly number[]} significant
 * @param {{ aIsTwo: boolean, cursor: number, unit: string }} head
 * @return {boolean | undefined}
 */
function parseNOffset(tokens, significant, head) {
  const { aIsTwo, unit } = head;
  const { cursor } = head;
  if (unit === 'n-') {
    const integerIndex = significant[cursor];
    if (integerIndex === undefined || cursor + 1 !== significant.length) {
      return undefined;
    }
    const integer = integerTokenValue(tokens[integerIndex]);
    return integer && !integer.signed ? false : undefined;
  }
  if (unit !== 'n') {
    const offsetIsOne = decimalSuffixIsOne(unit, 2);
    return unit.startsWith('n-') &&
      offsetIsOne !== undefined &&
      cursor === significant.length
      ? false
      : undefined;
  }
  return parseSeparatedOffset(tokens, significant, cursor, aIsTwo);
}

/**
 * Parse the CSS Syntax An+B microsyntax from a complete token span.
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ isTwoNPlusOne: boolean } | undefined}
 */
export function parseAnPlusB(tokens, start, end) {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end > tokens.length ||
    start >= end
  ) {
    return undefined;
  }

  /** @type {number[]} */
  const significant = [];
  for (let index = start; index < end; index++) {
    const type = tokens[index][0];
    if (type !== TokenType.Whitespace && type !== TokenType.Comment) {
      significant.push(index);
    }
  }
  if (significant.length === 0) return undefined;

  const token = tokens[significant[0]];
  if (token[0] === TokenType.Ident) {
    const value = decodedIdent(token);
    if (significant.length === 1 && (value === 'odd' || value === 'even')) {
      return { isTwoNPlusOne: value === 'odd' };
    }
  }
  if (token[0] === TokenType.Number) {
    const integer = integerTokenValue(token);
    return integer && significant.length === 1
      ? { isTwoNPlusOne: false }
      : undefined;
  }

  const head = parseNHead(tokens, significant);
  if (!head) return undefined;
  const isTwoNPlusOne = parseNOffset(tokens, significant, head);
  return isTwoNPlusOne === undefined ? undefined : { isTwoNPlusOne };
}

/** @param {CSSToken} token */
