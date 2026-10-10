import cssnanoUtils from 'cssnano-utils';

const { TokenType, asciiLowerCase, decoded } = cssnanoUtils;

/** @typedef {ReturnType<typeof import('cssnano-utils').default.balancedTokens> extends infer Structure ? Structure extends {tokens: readonly (infer Token)[]} ? Token : never : never} CSSToken */

/**
 * Decoded (escape-resolved) spelling of an ident token, lowercased for
 * ASCII-case-insensitive keyword matching. Prefer the raw token spelling
 * (`token[1]`) when matching case-sensitive identifiers.
 * @param {CSSToken} token @return {string}
 */
export function decodedIdent(token) {
  return asciiLowerCase(decoded(token));
}

/**
 * Whitespace and comments separate tokens without contributing to a selector.
 * @param {CSSToken | undefined} token
 */
export function isTrivia(token) {
  return (
    token?.[0] === TokenType.Whitespace || token?.[0] === TokenType.Comment
  );
}

/**
 * Index of the first token in `[index, end)` that is not trivia, or `end`.
 * @param {readonly CSSToken[]} input
 * @param {number} index
 * @param {number} end
 */
export function skipTrivia(input, index, end) {
  let cursor = index;
  while (cursor < end && isTrivia(input[cursor])) cursor++;
  return cursor;
}

/**
 * Minifiers keep `/*!` comments, such as license notices.
 * @param {CSSToken} token
 */
export function isImportantCommentToken(token) {
  return token[0] === TokenType.Comment && token[1].startsWith('/*!');
}

/**
 * Whitespace and ordinary comments vanish from minified arguments, while
 * important comments (`/*!`) survive into the output.
 * @param {CSSToken} token
 * @param {string[]} pieces
 * @return {boolean} whether the token was trivia
 */
export function consumeTrivia(token, pieces) {
  if (token[0] === TokenType.Whitespace) return true;
  if (token[0] !== TokenType.Comment) return false;
  if (isImportantCommentToken(token)) pieces.push(token[1]);
  return true;
}

/**
 * ASCII letters and underscore. Non-ASCII is excluded because CSS 2.1 and
 * CSS Syntax 3 disagree on its range.
 * @param {number} code
 */
function isNameStart(code) {
  return (
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a) ||
    code === 0x5f
  );
}

/**
 * Unquotes a string body only when it is an ASCII identifier without escapes.
 * Any other body is returned quoted.
 * @param {string} value
 */
export function unquote(value) {
  const raw = value.slice(1, -1);
  let index = raw.charCodeAt(0) === 0x2d ? 1 : 0;
  if (index === raw.length || !isNameStart(raw.charCodeAt(index))) return value;
  for (index++; index < raw.length; index++) {
    const code = raw.charCodeAt(index);
    if (!isNameStart(code) && !(code >= 0x30 && code <= 0x39) && code !== 0x2d)
      return value;
  }
  return raw;
}
