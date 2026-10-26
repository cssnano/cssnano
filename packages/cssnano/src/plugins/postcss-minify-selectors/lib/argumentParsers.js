import cssnanoUtils from '#utils';
import { serializeIdentifier } from '../../../values/escapes.js';
import { comma, delim, whitespace } from '../../../values/punctuationTokens.js';
import { ident } from '../../../values/tokenConstructors.js';
import { dropHexEscapeTerminator } from './hexEscape.js';
import { nameToken } from './outputTokens.js';
import { isImportantCommentToken, unquote } from './tokenUtils.js';

const { TokenType } = cssnanoUtils;

/** @typedef {import('./tokenUtils.js').CSSToken} CSSToken */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {{ pieces?: string[], tokens?: (CSSToken | undefined)[], valid: boolean }} PieceResult */

/**
 * Whitespace is trivia, and so is a comment. An important comment is kept as
 * a piece with its token, so the piece keeps the source text.
 * @param {CSSToken} token
 * @param {string[]} pieces
 * @param {(CSSToken | undefined)[]} tokens
 */
function consumeTrivia(token, pieces, tokens) {
  if (token[0] === TokenType.Whitespace) return true;
  if (token[0] !== TokenType.Comment) return false;
  if (isImportantCommentToken(token)) {
    pieces.push(token[1]);
    tokens.push(token);
  }
  return true;
}

/**
 * @param {string[]} pieces
 * @param {(CSSToken | undefined)[]} tokens
 * @param {readonly CSSToken[]} trivia important comments, each with its piece
 */
function pushTrivia(pieces, tokens, trivia) {
  for (const token of trivia) {
    pieces.push(token[1]);
    tokens.push(token);
  }
}

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

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {PieceResult & { specificity?: Specificity }}
 */
function normalizePtNameArgument(tokens, start, end) {
  /** @type {string[]} */
  const pieces = [];
  /** @type {(CSSToken | undefined)[]} */
  const pieceTokens = [];
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
    if (consumeTrivia(token, pieces, pieceTokens)) continue;
    if (!foundName && isPtNameStart(token)) {
      foundName = true;
      isWildcard = token[0] === TokenType.Delim && token[1] === '*';
      const text = dropHexEscapeTerminator(token[1]);
      pieces.push(text);
      pieceTokens.push(nameToken(token, text));
      continue;
    }
    if (!expectsClass && isPtClassSeparator(token)) {
      foundName = true;
      expectsClass = true;
      pieces.push('.');
      pieceTokens.push(delim('.'));
      continue;
    }
    if (expectsClass && type === TokenType.Ident) {
      const text = dropHexEscapeTerminator(token[1]);
      pieces.push(text);
      pieceTokens.push(nameToken(token, text));
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
    tokens: pieceTokens,
    valid: true,
    specificity: isWildcard && !hasClass ? [0, 0, 0] : [0, 0, 1],
  };
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {PieceResult}
 */
function normalizeIdentListArgument(tokens, start, end) {
  /** @type {string[]} */
  const pieces = [];
  /** @type {(CSSToken | undefined)[]} */
  const pieceTokens = [];
  let count = 0;

  for (let i = start; i < end; i++) {
    const token = tokens[i];
    const type = token[0];

    if (consumeTrivia(token, pieces, pieceTokens)) {
      continue;
    }
    if (type === TokenType.Ident) {
      if (count > 0) {
        pieces.push(' ');
        pieceTokens.push(whitespace());
      }
      const text = dropHexEscapeTerminator(token[1]);
      pieces.push(text);
      pieceTokens.push(nameToken(token, text));
      count++;
      continue;
    }
    return { valid: false };
  }

  if (count === 0) {
    return { valid: false };
  }

  return { pieces, tokens: pieceTokens, valid: true };
}

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {PieceResult}
 */
function normalizeIdentArgument(tokens, start, end) {
  /** @type {string[]} */
  const pieces = [];
  /** @type {(CSSToken | undefined)[]} */
  const pieceTokens = [];
  let foundIdent = false;

  for (let i = start; i < end; i++) {
    const token = tokens[i];
    const type = token[0];

    if (consumeTrivia(token, pieces, pieceTokens)) {
      continue;
    }
    if (type === TokenType.Ident && !foundIdent) {
      foundIdent = true;
      const text = dropHexEscapeTerminator(token[1]);
      pieces.push(text);
      pieceTokens.push(nameToken(token, text));
      continue;
    }
    return { valid: false };
  }

  if (!foundIdent) {
    return { valid: false };
  }

  return { pieces, tokens: pieceTokens, valid: true };
}

/** @param {CSSToken} token */
function isLanguageValue(token) {
  return token[0] === TokenType.Ident || token[0] === TokenType.String;
}

/**
 * The token of a language value. An identifier keeps its token. A string
 * value gets an identifier token only when its value is spelled as an
 * identifier, so the piece's text is the one the token reads back.
 * @param {CSSToken} token
 * @param {string} value
 * @return {CSSToken | undefined}
 */
function languageValueToken(token, value) {
  if (token[0] === TokenType.Ident) return nameToken(token, value);
  return value !== '' && serializeIdentifier(value) === value
    ? ident(value)
    : undefined;
}

/**
 * @param {{ value: string, token: CSSToken | undefined, trivia: CSSToken[], trailingTrivia: CSSToken[] }[]} items
 * @param {Set<string>} seen
 * @param {string} value
 * @param {CSSToken | undefined} token
 * @param {CSSToken[]} trivia
 */
function recordLanguageItem(items, seen, value, token, trivia) {
  if (!seen.has(value)) {
    seen.add(value);
    items.push({ value, token, trivia, trailingTrivia: [] });
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
 * @return {PieceResult}
 */
function normalizeIdentOrStringList(tokens, start, end) {
  /** @type {{ value: string, token: CSSToken | undefined, trivia: CSSToken[], trailingTrivia: CSSToken[] }[]} */
  const items = [];
  /** @type {CSSToken[]} */
  let currentTrivia = [];
  /** @type {Set<string>} */
  const seen = new Set();
  let expectItem = true;
  let hasTokenInItem = false;

  for (let i = start; i < end; i++) {
    const token = tokens[i];
    const type = token[0];

    if (token[0] === TokenType.Whitespace) {
      continue;
    }
    if (token[0] === TokenType.Comment) {
      if (isImportantCommentToken(token)) currentTrivia.push(token);
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
      const val =
        type === TokenType.String
          ? unquote(token[1])
          : dropHexEscapeTerminator(token[1]);
      recordLanguageItem(
        items,
        seen,
        val,
        languageValueToken(token, val),
        currentTrivia
      );
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
  /** @type {(CSSToken | undefined)[]} */
  const pieceTokens = [];
  for (let i = 0; i < items.length; i++) {
    if (i > 0) {
      pieces.push(',');
      pieceTokens.push(comma());
    }
    pushTrivia(pieces, pieceTokens, items[i].trivia);
    pieces.push(items[i].value);
    pieceTokens.push(items[i].token);
    pushTrivia(pieces, pieceTokens, items[i].trailingTrivia);
  }
  pushTrivia(pieces, pieceTokens, currentTrivia);

  return { pieces, tokens: pieceTokens, valid: true };
}

/**
 * Parsers of the pseudo-class and pseudo-element arguments that are
 * normalized as token pieces, keyed by the grammar name in `selectorGrammar`.
 * @type {ReadonlyMap<string, (tokens: readonly CSSToken[], start: number, end: number) => PieceResult & { specificity?: Specificity }>}
 */
export const pieceArgumentParsers = new Map([
  ['ident', normalizeIdentArgument],
  ['ident-list', normalizeIdentListArgument],
  ['ident-or-string-list', normalizeIdentOrStringList],
  ['pt-name-selector', normalizePtNameArgument],
]);
