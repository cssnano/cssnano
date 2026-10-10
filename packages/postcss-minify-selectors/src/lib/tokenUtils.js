import cssnanoUtils from 'cssnano-utils';

const { TokenType, asciiLowerCase, decoded, isHexDigitCode } = cssnanoUtils;

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
 * CSS whitespace before preprocessing, which folds CR and FF into LF.
 * @param {number} code
 */
function isWhitespaceCode(code) {
  return (
    code === 0x20 ||
    code === 0x09 ||
    code === 0x0a ||
    code === 0x0c ||
    code === 0x0d
  );
}

/**
 * Digit count of the hex escape that ends just before `end`, or 0 when no
 * hex escape ends there.
 * @param {string} value
 * @param {number} end
 */
export function hexEscapeDigitCount(value, end) {
  let index = end - 1;
  let digits = 0;
  while (digits < 6 && index >= 0 && isHexDigitCode(value.charCodeAt(index))) {
    index--;
    digits++;
  }
  if (value.charCodeAt(index) !== 0x5c) return 0;
  // An odd run of backslashes ends in an unescaped one; an even run is
  // escaped backslashes and the digits are literal.
  let backslashes = 1;
  while (
    index - backslashes >= 0 &&
    value.charCodeAt(index - backslashes) === 0x5c
  )
    backslashes++;
  return backslashes % 2 === 1 ? digits : 0;
}

/**
 * A hex escape (`\61 `) consumes one trailing whitespace (CSS Syntax 3
 * §4.3.7), so serializers keep idents without that terminator and let
 * `needsHexEscapeTerminator` restore it where the neighbor requires one. An
 * escaped whitespace (`\ `) is the escaped character itself and must stay.
 * Within an ident, a terminator is only kept before a hex digit or another
 * whitespace.
 * @param {string} value
 */
export function dropHexEscapeTerminator(value) {
  if (!value.includes('\\')) return value;
  let result = '';
  let copied = 0;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (!isWhitespaceCode(code)) continue;
    const length =
      code === 0x0d && value.charCodeAt(index + 1) === 0x0a ? 2 : 1;
    const end = index + length;
    if (
      hexEscapeDigitCount(value, index) > 0 &&
      (end === value.length ||
        !(
          isHexDigitCode(value.charCodeAt(end)) ||
          isWhitespaceCode(value.charCodeAt(end))
        ))
    ) {
      result += value.slice(copied, index);
      copied = end;
    }
    index = end - 1;
  }
  return copied === 0 ? value : result + value.slice(copied);
}

/**
 * The single rule for restoring hex escape terminators: every joiner calls it
 * between adjacent pieces. Whether `before` ends in a hex escape that `after`
 * would extend: a leading whitespace is absorbed as its terminator, and a
 * leading hex digit becomes part of the escape unless it already has six
 * digits.
 * @param {string} before
 * @param {string} after
 */
export function needsHexEscapeTerminator(before, after) {
  return needsTerminatorAfterDigits(
    hexEscapeDigitCount(before, before.length),
    after.charCodeAt(0)
  );
}

/**
 * `needsHexEscapeTerminator` for a caller that already knows the digit count
 * of the escape ending the preceding piece and the first code of the next.
 * @param {number} digits
 * @param {number} next
 */
export function needsTerminatorAfterDigits(digits, next) {
  if (!isWhitespaceCode(next) && !isHexDigitCode(next)) return false;
  return digits > 0 && (digits < 6 || isWhitespaceCode(next));
}

/**
 * Concatenates serialized pieces, adding the hex escape terminators that
 * `dropHexEscapeTerminator` removed.
 * @param {readonly string[]} pieces
 */
export function joinPieces(pieces) {
  let text = '';
  let previous = '';
  for (const piece of pieces) {
    if (piece === '') continue;
    if (needsHexEscapeTerminator(previous, piece)) text += ' ';
    text += piece;
    previous = piece;
  }
  return text;
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
