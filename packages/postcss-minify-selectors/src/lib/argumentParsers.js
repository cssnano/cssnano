import cssnanoUtils from 'cssnano-utils';
import { unquote } from './tokenUtils.js';

const { TokenType } = cssnanoUtils;

/** @typedef {import('./tokenUtils.js').CSSToken} CSSToken */
/** @typedef {import('./specificity.js').Specificity} Specificity */
/** @typedef {import('./foldToIs.js').FunctionResult} FunctionResult */

/** @param {string} kind @return {string | undefined} */
export function firstPseudoReplacement(kind) {
  if (kind === 'child') return ':first-child';
  if (kind === 'of-type') return ':first-of-type';
  if (kind === 'last-child' || kind === 'last-of-type') return `:${kind}`;
  return undefined;
}

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
function isPtNameStart(token) {
  return (
    token[0] === TokenType.Ident ||
    (token[0] === TokenType.Delim && token[1] === '*')
  );
}

/** @param {CSSToken} token */
function isPtClassSeparator(token) {
  return token[0] === TokenType.Delim && token[1] === '.';
}

/** @param {CSSToken} token */
function compactTokenValue(token) {
  return token[1].endsWith(' ') ? token[1].trimEnd() : token[1];
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: (string | FunctionResult)[], specificity?: Specificity, valid: boolean }}
 */
export function normalizePtNameArgument(tokens, start, end) {
  /** @type {(string | FunctionResult)[]} */
  const pieces = [];
  let foundName = false;
  let expectsClass = false;
  let hasClass = false;
  let isWildcard = false;

  for (let i = start; i < end; i++) {
    const token = tokens[i];
    const type = token[0];

    if (type === TokenType.Whitespace) {
      continue;
    }
    if (type === TokenType.Comment) {
      if (token[1].startsWith('/*!')) {
        pieces.push(token[1]);
      }
      continue;
    }
    if (!foundName && isPtNameStart(token)) {
      foundName = true;
      isWildcard = token[0] === TokenType.Delim && token[1] === '*';
      pieces.push(compactTokenValue(token));
      continue;
    }
    if (!foundName && isPtClassSeparator(token)) {
      foundName = true;
      expectsClass = true;
      pieces.push('.');
      continue;
    }
    if (foundName && !expectsClass && isPtClassSeparator(token)) {
      pieces.push('.');
      expectsClass = true;
      continue;
    }
    if (expectsClass && type === TokenType.Ident) {
      pieces.push(compactTokenValue(token));
      expectsClass = false;
      hasClass = true;
      continue;
    }
    return { valid: false };
  }

  if (!foundName || expectsClass) {
    return { valid: false };
  }

  return {
    pieces,
    valid: true,
    specificity: isWildcard && !hasClass ? [0, 0, 0] : [0, 0, 1],
  };
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: (string | FunctionResult)[], valid: boolean }}
 */
export function normalizeIdentListArgument(tokens, start, end) {
  /** @type {(string | FunctionResult)[]} */
  const pieces = [];
  let count = 0;

  for (let i = start; i < end; i++) {
    const token = tokens[i];
    const type = token[0];

    if (type === TokenType.Whitespace) {
      continue;
    }
    if (type === TokenType.Comment) {
      if (token[1].startsWith('/*!')) {
        pieces.push(token[1]);
      }
      continue;
    }
    if (type === TokenType.Ident) {
      if (count > 0) {
        pieces.push(' ');
      }
      let val = token[1];
      if (val.endsWith(' ')) val = val.trimEnd();
      pieces.push(val);
      count++;
      continue;
    }
    return { valid: false };
  }

  if (count === 0) {
    return { valid: false };
  }

  return { pieces, valid: true };
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: (string | FunctionResult)[], valid: boolean }}
 */
export function normalizeIdentArgument(tokens, start, end) {
  /** @type {(string | FunctionResult)[]} */
  const pieces = [];
  let foundIdent = false;

  for (let i = start; i < end; i++) {
    const token = tokens[i];
    const type = token[0];

    if (type === TokenType.Whitespace) {
      continue;
    }
    if (type === TokenType.Comment) {
      if (token[1].startsWith('/*!')) {
        pieces.push(token[1]);
      }
      continue;
    }
    if (type === TokenType.Ident && !foundIdent) {
      foundIdent = true;
      let val = token[1];
      if (val.endsWith(' ')) val = val.trimEnd();
      pieces.push(val);
      continue;
    }
    return { valid: false };
  }

  if (!foundIdent) {
    return { valid: false };
  }

  return { pieces, valid: true };
}

/** @param {CSSToken} token */
function isLanguageValue(token) {
  return token[0] === TokenType.Ident || token[0] === TokenType.String;
}

/**
 * @param {{ value: string, trivia: string[], trailingTrivia: string[] }[]} items
 * @param {Set<string>} seen
 * @param {string} value
 * @param {string[]} trivia
 */
function recordLanguageItem(items, seen, value, trivia) {
  if (!seen.has(value)) {
    seen.add(value);
    items.push({ value, trivia, trailingTrivia: [] });
    return;
  }
  const previousItem = items.at(-1);
  if (trivia.length > 0 && previousItem) {
    previousItem.trailingTrivia.push(...trivia);
  }
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ pieces?: (string | FunctionResult)[], valid: boolean }}
 */
export function normalizeIdentOrStringList(tokens, start, end) {
  /** @type {{ value: string, trivia: string[], trailingTrivia: string[] }[]} */
  const items = [];
  /** @type {string[]} */
  let currentTrivia = [];
  /** @type {Set<string>} */
  const seen = new Set();
  let expectItem = true;
  let hasTokenInItem = false;

  for (let i = start; i < end; i++) {
    const token = tokens[i];
    const type = token[0];

    if (type === TokenType.Whitespace) {
      continue;
    }
    if (type === TokenType.Comment) {
      if (token[1].startsWith('/*!')) {
        currentTrivia.push(token[1]);
      }
      continue;
    }
    if (type === TokenType.Comma) {
      if (expectItem || !hasTokenInItem) {
        return { valid: false };
      }
      expectItem = true;
      hasTokenInItem = false;
      continue;
    }
    if (expectItem && isLanguageValue(token)) {
      let val = type === TokenType.String ? unquote(token[1]) : token[1];
      if (val.endsWith(' ')) val = val.trimEnd();
      recordLanguageItem(items, seen, val, currentTrivia);
      currentTrivia = [];
      expectItem = false;
      hasTokenInItem = true;
      continue;
    }
    return { valid: false };
  }

  if (expectItem || items.length === 0) {
    return { valid: false };
  }

  /** @type {(string | FunctionResult)[]} */
  const pieces = [];
  for (let i = 0; i < items.length; i++) {
    if (i > 0) pieces.push(',');
    pieces.push(...items[i].trivia, items[i].value, ...items[i].trailingTrivia);
  }
  if (currentTrivia.length > 0) {
    pieces.push(...currentTrivia);
  }

  return { pieces, valid: true };
}
