import cssnanoUtils from '#utils';

const { TokenType, closeForOpening, tokenEnd, tokenStart, tokens } =
  cssnanoUtils;

export const closingTokens = new Set([
  TokenType.CloseParen,
  TokenType.CloseSquare,
  TokenType.CloseCurly,
]);

/**
 * A top-level component: its text, its tokens, and the range of the caller's
 * token list that holds them, `end` exclusive.
 *
 * @typedef {{
 *   raw: string,
 *   tokens: import('@csstools/css-tokenizer').CSSToken[],
 *   start: number,
 *   end: number,
 * }} Component
 */

/**
 * Split raw CSS into top-level components and comma-separated parts. This is
 * deliberately lexical: property grammar is applied by the caller after
 * brackets and source ranges have been preserved.
 *
 * @param {string} value
 * @param {',' | '/'} [separator] - the top-level token that divides the value
 * into parts; a comma is otherwise a failure, and a slash an ordinary token
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [list] the
 * tokens of `value`, when the caller has them from the text table
 * @return {{components: Component[], raw: string}[] | null}
 */
export function splitValue(value, separator, list = tokens(value)) {
  /** @type {{components: Component[], start: number, end: number}[]} */
  const parts = [{ components: [], start: 0, end: value.length }];
  /** @type {import('@csstools/css-tokenizer').CSSToken[]} */
  let current = [];
  /** @type {import('@csstools/css-tokenizer').TokenType[]} */
  const stack = [];

  /** @param {number} end the index of the token that closes the component */
  const push = (end) => {
    if (!current.length) return;
    const first = current[0];
    const last = current.at(-1);
    const part = parts.at(-1);
    if (!first || !last || !part) return;
    // Every token since the last separator is in `current`, so it starts there.
    part.components.push({
      raw: value.slice(tokenStart(first), tokenEnd(last)),
      tokens: current,
      start: end - current.length,
      end,
    });
    current = [];
  };

  for (let index = 0; index < list.length; index++) {
    const token = list[index];
    const type = token[0];
    if (type === TokenType.Comment) return null;

    if (!stack.length && type === TokenType.Whitespace) {
      push(index);
      continue;
    }
    if (!stack.length && type === TokenType.Comma && separator !== ',') {
      return null;
    }
    if (
      !stack.length &&
      (type === TokenType.Comma ||
        (separator === '/' && type === TokenType.Delim && token[1] === '/'))
    ) {
      push(index);
      const part = parts.at(-1);
      if (!part) return null;
      part.end = tokenStart(token);
      parts.push({ components: [], start: tokenEnd(token), end: value.length });
      continue;
    }

    current.push(token);
    const expected = closeForOpening(type);
    if (expected !== undefined) {
      stack.push(expected);
    } else if (closingTokens.has(type) && stack.pop() !== type) {
      return null;
    }
  }

  if (stack.length) return null;
  push(list.length);
  if (parts.some((part) => !part.components.length)) return null;

  return parts.map((part) => ({
    components: part.components,
    raw: value.slice(part.start, part.end).trim(),
  }));
}
