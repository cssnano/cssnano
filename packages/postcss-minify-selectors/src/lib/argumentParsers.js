import cssnanoUtils from 'cssnano-utils';
import { unquote } from './tokenUtils.js';

const { TokenType } = cssnanoUtils;

/** @typedef {import('./tokenUtils.js').CSSToken} CSSToken */
/** @typedef {import('./arena.js').Specificity} Specificity */

/** @param {string} kind @return {string | undefined} */
export function firstPseudoReplacement(kind) {
  if (kind === 'child') return ':first-child';
  if (kind === 'of-type') return ':first-of-type';
  if (kind === 'last-child' || kind === 'last-of-type') return `:${kind}`;
  return undefined;
}

export { parseAnPlusB } from './anPlusB.js';

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
 * @return {{ pieces?: string[], specificity?: Specificity, valid: boolean }}
 */
export function normalizePtNameArgument(tokens, start, end) {
  /** @type {string[]} */
  const pieces = [];
  let foundName = false;
  let expectsClass = false;
  let hasClass = false;
  let isWildcard = false;
  let sawTrailingWhitespace = false;

  for (let i = start; i < end; i++) {
    const token = tokens[i];
    const type = token[0];

    if (type === TokenType.Whitespace) {
      if (expectsClass) return { valid: false };
      sawTrailingWhitespace = sawTrailingWhitespace || foundName;
      continue;
    }
    if (sawTrailingWhitespace && type !== TokenType.Comment) {
      return { valid: false };
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
    if (!expectsClass && isPtClassSeparator(token)) {
      foundName = true;
      expectsClass = true;
      pieces.push('.');
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
 * @return {{ pieces?: string[], valid: boolean }}
 */
export function normalizeIdentListArgument(tokens, start, end) {
  /** @type {string[]} */
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
 * @return {{ pieces?: string[], valid: boolean }}
 */
export function normalizeIdentArgument(tokens, start, end) {
  /** @type {string[]} */
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
 * @return {{ pieces?: string[], valid: boolean }}
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

  /** @type {string[]} */
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
