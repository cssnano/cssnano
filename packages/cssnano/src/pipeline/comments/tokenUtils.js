import { tokenize, TokenType } from '@csstools/css-tokenizer';

/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */

/**
 * @param {string} source
 * @param {Map<string, CSSToken[]>} parserCache
 * @return {CSSToken[]}
 */
export function getTokens(source, parserCache) {
  let tokens = parserCache.get(source);

  if (tokens) {
    return tokens;
  }

  tokens = tokenize({ css: source });

  parserCache.set(source, tokens);

  return tokens;
}

/**
 * The comment text without its delimiters. An unclosed comment has no
 * trailing delimiter, so only the leading one is stripped.
 *
 * @param {string} raw
 * @return {string}
 */
export function commentContents(raw) {
  return raw.endsWith('*/') ? raw.slice(2, -2) : raw.slice(2);
}

/**
 * Whether joining two raw spellings would re-tokenize as a different token
 * sequence.
 *
 * @param {string} previousRaw
 * @param {string} nextRaw
 * @param {Map<string, CSSToken[]>} parserCache
 * @return {boolean}
 */
export function joinsIntoDifferentTokens(previousRaw, nextRaw, parserCache) {
  const joined = getTokens(previousRaw + nextRaw, parserCache).filter(
    ([type]) => type !== TokenType.EOF
  );
  const separate = [
    ...getTokens(previousRaw, parserCache),
    ...getTokens(nextRaw, parserCache),
  ].filter(([type]) => type !== TokenType.EOF);

  return (
    joined.length !== separate.length ||
    joined.some(([type, raw], index) => {
      const [otherType, otherRaw] = separate[index];
      return type !== otherType || raw !== otherRaw;
    })
  );
}
