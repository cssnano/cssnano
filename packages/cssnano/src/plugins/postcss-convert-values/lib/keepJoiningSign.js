import cssnanoUtils from '#utils';

const { TokenType, tokenEnd } = cssnanoUtils;

/* Tokens after which a number can lose its `+` sign. Any other token that ends
 * right before the number could absorb it, e.g. `u+1` would become the ident
 * `u1` and `-+1` the number `-1`. */
const signFreeAfter = new Set([
  TokenType.Whitespace,
  TokenType.Comment,
  TokenType.Comma,
  TokenType.Colon,
  TokenType.Semicolon,
  TokenType.Function,
  TokenType.OpenParen,
  TokenType.OpenSquare,
  TokenType.OpenCurly,
  TokenType.CloseParen,
  TokenType.CloseSquare,
  TokenType.CloseCurly,
]);

/**
 * @param {{start: number, end: number, text: string}} edit
 * @param {{start: number, raw: string}} source
 * @param {ReturnType<typeof cssnanoUtils.tokens>[number] | undefined} previous
 * @return {{start: number, end: number, text: string}}
 */
export function keepJoiningSign(edit, source, previous) {
  if (source.raw[0] !== '+' || edit.text[0] === '+') return edit;
  if (
    !previous ||
    signFreeAfter.has(previous[0]) ||
    tokenEnd(previous) !== source.start
  ) {
    return edit;
  }
  edit.text = '+' + edit.text;
  return edit;
}
