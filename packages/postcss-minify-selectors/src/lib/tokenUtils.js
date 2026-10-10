import cssnanoUtils from 'cssnano-utils';

const { isHexDigitCode } = cssnanoUtils;

/** @typedef {ReturnType<typeof import('cssnano-utils').default.balancedTokens> extends infer Structure ? Structure extends {tokens: readonly (infer Token)[]} ? Token : never : never} CSSToken */

/**
 * Decoded (escape-resolved) spelling of an ident token, lowercased for
 * ASCII-case-insensitive keyword matching. Prefer the raw token spelling
 * (`token[1]`) when matching case-sensitive identifiers.
 * @param {CSSToken} token @return {string}
 */
export function decodedIdent(token) {
  const metadata = /** @type {{value?:string} | undefined} */ (token[4]);
  return (metadata?.value ?? token[1]).toLowerCase();
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
 * A hex escape (`\\61 `) consumes one trailing whitespace (CSS Syntax 3
 * §4.3.7), which is redundant when a delimiter follows. An escaped whitespace
 * (`\\ `) is the escaped character itself and must stay. Callers must ensure
 * the next output character is not whitespace. A following hex digit keeps
 * the terminator unless the escape already has six digits.
 * @param {string} value
 * @param {boolean} [beforeHexDigit]
 */
export function dropHexEscapeTerminator(value, beforeHexDigit = false) {
  const last = value.length - 1;
  const code = value.charCodeAt(last);
  if (
    code !== 0x20 &&
    code !== 0x09 &&
    code !== 0x0a &&
    code !== 0x0c &&
    code !== 0x0d
  )
    return value;
  const terminatorLength =
    code === 0x0a && value.charCodeAt(last - 1) === 0x0d ? 2 : 1;
  let index = last - terminatorLength;
  let digits = 0;
  while (digits < 6 && index >= 0 && isHexDigitCode(value.charCodeAt(index))) {
    index--;
    digits++;
  }
  return digits > 0 &&
    (digits === 6 || !beforeHexDigit) &&
    value.charCodeAt(index) === 0x5c
    ? value.slice(0, -terminatorLength)
    : value;
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
