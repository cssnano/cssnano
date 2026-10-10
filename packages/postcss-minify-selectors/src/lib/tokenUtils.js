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
