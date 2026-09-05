import cssesc from 'cssesc';

/** @typedef {ReturnType<typeof import('cssnano-utils').default.balancedTokens> extends infer Structure ? Structure extends {tokens: readonly (infer Token)[]} ? Token : never : never} CSSToken */

/** @param {string} value */
export function unquote(value) {
  const raw = value.slice(1, -1);
  if (!raw || raw === '-' || /[\s"'()[\]{}=~|^$*]/u.test(raw)) return value;
  const unescaped = raw.replace(/\\([\\"'])/gu, '$1');
  return cssesc(unescaped, { isIdentifier: true }) === unescaped
    ? unescaped
    : value;
}
