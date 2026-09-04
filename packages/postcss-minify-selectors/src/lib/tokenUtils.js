import cssnanoUtils from 'cssnano-utils';
import cssesc from 'cssesc';

const { TokenType } = cssnanoUtils;

/** @typedef {ReturnType<typeof cssnanoUtils.balancedTokens> extends infer Structure ? Structure extends {tokens: readonly (infer Token)[]} ? Token : never : never} CSSToken */

/** @param {string} value */
export function unquote(value) {
  const raw = value.slice(1, -1);
  if (!raw || raw === '-' || /[\s"'()[\]{}=~|^$*]/u.test(raw)) return value;
  const unescaped = raw.replace(/\\([\\"'])/gu, '$1');
  return cssesc(unescaped, { isIdentifier: true }) === unescaped
    ? unescaped
    : value;
}

/** @param {string} value */
export function normalizeFormula(value) {
  return value
    .replace(/\s*([+])\s*/gu, '$1')
    .replace(/\b[Ee][Vv][Ee][Nn]\b/gu, 'even')
    .replace(/\b[Oo][Dd][Dd]\b/gu, 'odd');
}

/** @param {CSSToken | undefined} token */
export function isCombinator(token) {
  return token?.[0] === TokenType.Delim && /^[>+~]$/u.test(token[1]);
}

/** @param {readonly CSSToken[]} tokens @param {number} index */
export function isColumnCombinator(tokens, index) {
  return (
    tokens[index]?.[0] === TokenType.Delim &&
    tokens[index][1] === '|' &&
    tokens[index + 1]?.[0] === TokenType.Delim &&
    tokens[index + 1][1] === '|'
  );
}

/** @param {readonly CSSToken[]} tokens @param {number} index */
export function isDeepBoundary(tokens, index) {
  return (
    tokens[index]?.[1] === '/' &&
    tokens[index + 1]?.[1]?.toLowerCase() === 'deep' &&
    tokens[index + 2]?.[1] === '/'
  );
}

/** @param {CSSToken | undefined} next @param {string | undefined} before */
export function skipUniversal(next, before) {
  return Boolean(
    next &&
    next[0] !== TokenType.Whitespace &&
    next[0] !== TokenType.Comma &&
    next[0] !== TokenType.CloseParen &&
    !['|'].includes(next[1]) &&
    !['>', '+', '~'].includes(next[1] ?? '') &&
    before !== '|' &&
    !['>', '+', '~'].includes(before ?? '')
  );
}

/** @param {{operator: boolean, value: boolean} | undefined} attribute @param {CSSToken | undefined} previous @param {CSSToken | undefined} next */
export function keepWhitespace(attribute, previous, next) {
  if (attribute) return next?.[0] === TokenType.Ident && attribute.value;
  return (
    previous?.[0] !== TokenType.Comma &&
    next?.[0] !== TokenType.Comma &&
    next?.[0] !== TokenType.CloseParen &&
    next?.[0] !== TokenType.CloseSquare
  );
}
