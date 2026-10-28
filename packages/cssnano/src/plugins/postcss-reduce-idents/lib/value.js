import cssnanoUtils from '#utils';
import { knownFunctions } from './slots.js';
import { identifierWithText } from '../../../values/tokenConstructors.js';

const { TokenType } = cssnanoUtils;

/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/** @import {TokenEdit} from '../../../values/valueBuffer.js' */
/** @type {(value: string) => CSSToken[]} */
const sharedTokens = cssnanoUtils.tokens;

// Treat var()/env()/attr() as opaque: they take whole declaration values,
// so their contents may name anything.
const SUBSTITUTION_FUNCTIONS = new Set(['var', 'env', 'attr']);

// Read-only: `tokenPosition` only calls `get` on it.
const NO_FUNCTIONS = new Map();

/**
 * Describe where a token sits in a value: an identifier is `bare` at the
 * value's top level, `bracketed` in a line-name list, `argument` in a slot
 * the function map names, or `nested` anywhere else. Any other token kind is
 * `other`, or `nested` inside a substitution function.
 *
 * @typedef {'bare' | 'bracketed' | 'argument' | 'nested' | 'other'} TokenPosition
 */

/**
 * @typedef {{arguments?: number[], index: number, close: string, name?: string, substitution?: boolean}} Frame
 */

/**
 * Track a value's open brackets and substitution-function frames, to test in
 * O(1) whether a token sits inside substituted text.
 *
 * @typedef {{frames: Frame[], substitutions: number}} Walk
 */

/**
 * Advance the walk past a token and return its position.
 *
 * @param {CSSToken} token
 * @param {Map<string, number[]>} functions
 * @param {Walk} walk
 * @return {TokenPosition}
 */
function tokenPosition(token, functions, walk) {
  const type = token[0];
  const frame = walk.frames.at(-1);
  if (type === TokenType.Function) {
    const name = token[1].slice(0, -1).toLowerCase();
    const substitution = SUBSTITUTION_FUNCTIONS.has(name);
    if (substitution) walk.substitutions++;
    walk.frames.push({
      arguments: functions.get(name),
      index: 0,
      close: TokenType.CloseParen,
      name,
      substitution,
    });
  } else if (type === TokenType.OpenParen) {
    walk.frames.push({ index: 0, close: TokenType.CloseParen });
  } else if (type === TokenType.OpenSquare) {
    walk.frames.push({ index: 0, close: TokenType.CloseSquare });
  } else if (type === TokenType.OpenCurly) {
    walk.frames.push({ index: 0, close: TokenType.CloseCurly });
  } else if (type === frame?.close) {
    if (frame.substitution) walk.substitutions--;
    walk.frames.pop();
  } else if (type === TokenType.Comma && frame) {
    frame.index++;
  } else if (type === TokenType.Ident) {
    // Treat a name inside substituted text as `nested`.
    if (walk.substitutions > 0) return 'nested';
    if (frame === undefined) return 'bare';
    // Treat names in a bracketed line-name list as `bracketed` whatever
    // function wraps the list.
    if (frame.close === TokenType.CloseSquare) return 'bracketed';
    return frame.arguments?.includes(frame.index) ? 'argument' : 'nested';
  } else if (walk.substitutions > 0) {
    // Treat substituted text as `nested`: it is written where it is used.
    return 'nested';
  }
  return 'other';
}

/**
 * The identifier token that spells an encoded name as the encoder wrote it,
 * so the token keeps that text even when the encoder's output is not an
 * identifier the tokenizer would read back.
 *
 * @param {string} name
 * @return {CSSToken}
 */
function encodedIdent(name) {
  return identifierWithText(name, name);
}

/**
 * Return the decoded identifier an at-rule's prelude holds, such as an
 * `@keyframes` name, ignoring the whitespace and comments around it.
 *
 * @param {readonly CSSToken[]} parsedTokens the tokens of the prelude
 * @return {string | undefined}
 */
function atRuleIdent(parsedTokens) {
  for (const token of parsedTokens) {
    if (token[0] === TokenType.Ident) return token[4].value;
    if (token[0] !== TokenType.Whitespace && token[0] !== TokenType.Comment) {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Walk a value's tokens in source order and let the callback replace
 * spellings; each token's position tells where it sits.
 *
 * @param {string} value
 * @param {(token: CSSToken, position: TokenPosition) => string|undefined} callback
 * @param {Map<string, number[]>} [functions]
 * @param {readonly CSSToken[]} [parsedTokens]
 * @return {string}
 */
function rewrite(
  value,
  callback,
  functions,
  parsedTokens = sharedTokens(value)
) {
  /** @type {Walk} */
  const walk = { frames: [], substitutions: 0 };
  const pieces = [];
  let cursor = 0;
  let changed = false;
  for (const token of parsedTokens) {
    const position = tokenPosition(token, functions ?? NO_FUNCTIONS, walk);
    const text = callback(token, position);
    if (text === undefined) continue;
    const start = token[2];
    if (start > cursor) {
      pieces.push(value.slice(cursor, start));
    }
    pieces.push(text);
    cursor = token[3] + 1;
    changed = true;
  }
  if (!changed) return value;
  if (cursor < value.length) {
    pieces.push(value.slice(cursor));
  }
  return pieces.join('');
}

/**
 * Collect the edits that swap tokens for the tokens a callback returns. The
 * walk and the positions are the same as rewrite's.
 *
 * @param {readonly CSSToken[]} parsedTokens
 * @param {(token: CSSToken, position: TokenPosition) => CSSToken | undefined} callback
 * @param {Map<string, number[]>} [functions]
 * @return {TokenEdit[]}
 */
function tokenEdits(parsedTokens, callback, functions) {
  /** @type {Walk} */
  const walk = { frames: [], substitutions: 0 };
  /** @type {TokenEdit[]} */
  const edits = [];
  for (let index = 0; index < parsedTokens.length; index++) {
    const token = parsedTokens[index];
    const position = tokenPosition(token, functions ?? NO_FUNCTIONS, walk);
    const replacement = callback(token, position);
    if (replacement !== undefined) {
      edits.push({ start: index, end: index + 1, tokens: [replacement] });
    }
  }
  return edits;
}

/**
 * Collect into a set the identifiers a value names from positions no grammar
 * defines. Leave those names unrenamed.
 *
 * @param {string} value
 * @param {Set<string>} into
 * @param {readonly CSSToken[]} [parsedTokens]
 */
function collectOpaqueIdents(value, into, parsedTokens = sharedTokens(value)) {
  rewrite(
    value,
    (token, position) => {
      if (token[0] === TokenType.Ident && position === 'nested') {
        into.add(token[4].value);
      }
    },
    knownFunctions,
    parsedTokens
  );
}

export {
  TokenType,
  atRuleIdent,
  collectOpaqueIdents,
  encodedIdent,
  rewrite,
  sharedTokens as tokens,
  tokenEdits,
};
