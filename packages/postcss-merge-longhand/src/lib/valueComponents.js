import cssnanoUtils from 'cssnano-utils';

const { TokenType, tokenEnd, tokenStart, tokens } = cssnanoUtils;

const openingTokens = new Map([
  [TokenType.Function, TokenType.CloseParen],
  [TokenType.OpenParen, TokenType.CloseParen],
  [TokenType.OpenSquare, TokenType.CloseSquare],
  [TokenType.OpenCurly, TokenType.CloseCurly],
]);

const closingTokens = new Set([
  TokenType.CloseParen,
  TokenType.CloseSquare,
  TokenType.CloseCurly,
]);

/**
 * @typedef {{raw: string, tokens: import('@csstools/css-tokenizer').CSSToken[]}}
 *   Component
 */

/**
 * Split raw CSS into top-level components and comma-separated parts. This is
 * deliberately lexical: property grammar is applied by the caller after
 * brackets and source ranges have been preserved.
 *
 * @param {string} value
 * @param {boolean} allowCommas
 * @return {{components: Component[], raw: string}[] | null}
 */
export function splitValue(value, allowCommas) {
  /** @type {{components: Component[], start: number, end: number}[]} */
  const parts = [{ components: [], start: 0, end: value.length }];
  /** @type {import('@csstools/css-tokenizer').CSSToken[]} */
  let current = [];
  /** @type {import('@csstools/css-tokenizer').TokenType[]} */
  const stack = [];

  const push = () => {
    if (!current.length) return;
    const first = current[0];
    const last = current.at(-1);
    const part = parts.at(-1);
    if (!first || !last || !part) return;
    part.components.push({
      raw: value.slice(tokenStart(first), tokenEnd(last)),
      tokens: current,
    });
    current = [];
  };

  for (const token of tokens(value)) {
    const type = token[0];
    if (type === TokenType.Comment) return null;

    if (!stack.length && type === TokenType.Whitespace) {
      push();
      continue;
    }
    if (!stack.length && type === TokenType.Comma) {
      if (!allowCommas) return null;
      push();
      const part = parts.at(-1);
      if (!part) return null;
      part.end = tokenStart(token);
      parts.push({ components: [], start: tokenEnd(token), end: value.length });
      continue;
    }

    current.push(token);
    const expected = openingTokens.get(type);
    if (expected !== undefined) {
      stack.push(expected);
    } else if (closingTokens.has(type) && stack.pop() !== type) {
      return null;
    }
  }

  if (stack.length) return null;
  push();
  if (parts.some((part) => !part.components.length)) return null;

  return parts.map((part) => ({
    components: part.components,
    raw: value.slice(part.start, part.end).trim(),
  }));
}
