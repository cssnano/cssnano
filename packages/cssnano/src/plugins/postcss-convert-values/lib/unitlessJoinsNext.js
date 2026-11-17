import cssnanoUtils from '#utils';

const { TokenType } = cssnanoUtils;

/** @typedef {import('./convert.js').Spelling} Spelling */
/** @typedef {ReturnType<typeof cssnanoUtils.tokens>[number]} CSSToken */

/* Tokens that would merge with a bare number touching them. */
const joinsNumber = new Set([
  TokenType.Number,
  TokenType.Dimension,
  TokenType.Percentage,
  TokenType.Ident,
  TokenType.Function,
  TokenType.URL,
  TokenType.BadURL,
  TokenType.CDC,
]);

/**
 * Whether the new spelling is a bare number and the next token touches it,
 * so the two would read back as one token or another value, e.g. `0px.5px`
 * as `0.5px`, `1.0.5` as `1.5`, `0%top` as the dimension `0top`, `50%%` as
 * `.5%`.
 *
 * @param {Spelling} spelling
 * @param {CSSToken | undefined} next
 * @return {boolean}
 */
export function unitlessJoinsNext(spelling, next) {
  if (spelling.unit !== '' || !next) return false;
  return (
    joinsNumber.has(next[0]) || (next[0] === TokenType.Delim && next[1] === '%')
  );
}
