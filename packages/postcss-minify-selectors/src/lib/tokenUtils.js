import cssesc from 'cssesc';

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

/** @param {string} value */
export function unquote(value) {
  const raw = value.slice(1, -1);
  if (!raw || raw === '-' || /[\s"'()[\]{}=~|^$*]/u.test(raw)) return value;
  const unescaped = raw.replace(/\\([\\"'])/gu, '$1');
  return cssesc(unescaped, { isIdentifier: true }) === unescaped
    ? unescaped
    : value;
}
