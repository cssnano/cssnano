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

/** @param {string} type */
function isValidAnPlusBTokenType(type) {
  return (
    type === TokenType.Whitespace ||
    type === TokenType.Comment ||
    type === TokenType.Ident ||
    type === TokenType.Dimension ||
    type === TokenType.Number ||
    type === TokenType.Delim
  );
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {string}
 */
function formatAnPlusBWithComments(tokens, start, end) {
  const pieces = [];
  for (let index = start; index < end; index++) {
    const t = tokens[index];
    if (t[0] === TokenType.Whitespace) continue;
    if (t[0] === TokenType.Comment) {
      if (t[1].startsWith('/*!')) pieces.push(t[1]);
      continue;
    }
    let val = t[1];
    if (val.endsWith(' ')) val = val.trimEnd();
    pieces.push(val);
  }
  return pieces.join('');
}

/**
 * Parse the CSS Syntax An+B microsyntax from its token span. In particular,
 * whitespace is not freely removable around a leading sign: `+ n` is invalid,
 * whereas `2n + 1` is valid. A failed parse deliberately has no partial
 * serialization so callers can retain the complete containing function.
 * Preserves important comments (starting with /*!) within valid formulas.
 * @param {string} source
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {{ value?: string, valid: boolean }}
 */
export function parseAnPlusB(source, tokens, start, end) {
  if (start >= end) return { valid: false };
  let hasImportantComment = false;

  for (let index = start; index < end; index++) {
    const type = tokens[index][0];
    if (!isValidAnPlusBTokenType(type)) {
      return { valid: false };
    }
    if (type === TokenType.Comment && tokens[index][1].startsWith('/*!')) {
      hasImportantComment = true;
    }
  }

  const raw = source
    .slice(tokens[start][2], tokens[end - 1][3] + 1)
    .replace(/\/\*[\s\S]*?\*\//gu, ' ')
    .trim();
  const keyword = raw.toLowerCase();

  let match;
  let isNumber = false;
  if (keyword === 'even' || keyword === 'odd') {
    // handled
  } else if (/^[+-]?\d+$/u.test(raw)) {
    isNumber = true;
  } else {
    match = /^([+-]?(?:\d+)?n)(?:\s*([+-])\s*(\d+))?$/iu.exec(raw);
    if (!match) return { valid: false };
  }

  if (hasImportantComment) {
    return {
      value: formatAnPlusBWithComments(tokens, start, end),
      valid: true,
    };
  }

  if (keyword === 'even') return { value: '2n', valid: true };
  if (keyword === 'odd') return { value: 'odd', valid: true };
  if (isNumber) return { value: raw, valid: true };
  if (!match) return { valid: false };

  let a = match[1].toLowerCase();
  if (a.startsWith('+')) a = a.slice(1);
  const b = match[3];
  if (!b) return { value: a, valid: true };
  return { value: a + match[2] + b, valid: true };
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
