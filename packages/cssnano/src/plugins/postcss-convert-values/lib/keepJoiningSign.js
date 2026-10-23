import cssnanoUtils from '#utils';

const { TokenType } = cssnanoUtils;

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
 * Restores the `+` of a source spelling that the new spelling lost. The
 * previous token is the one right before the number, so it touches it.
 *
 * @param {import('./convert.js').Spelling} spelling
 * @param {{raw: string}} source
 * @param {ReturnType<typeof cssnanoUtils.tokens>[number] | undefined} previous
 * @return {import('./convert.js').Spelling}
 */
export function keepJoiningSign(spelling, source, previous) {
  if (source.raw[0] !== '+' || spelling.representation[0] === '+') {
    return spelling;
  }
  if (!previous || signFreeAfter.has(previous[0])) return spelling;
  return { representation: '+' + spelling.representation, unit: spelling.unit };
}
