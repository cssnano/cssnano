import cssnanoUtils from '#utils';

const { TokenType, tokens } = cssnanoUtils;

/** @import {ValueBuffer} from '../../../values/valueBuffer.js' */
/** @typedef {ReturnType<typeof tokens>[number]} CSSToken */

/* Only `unicode-range` and custom properties keep `U+` ranges as one token. */
const unicodeRangeOptions = { unicodeRangesAllowed: true };

/**
 * Whether an identifier `u` or `U` is directly followed by a token that starts
 * with `+`, the only way a `U+` range can begin.
 *
 * @param {readonly CSSToken[]} input
 * @return {boolean}
 */
function hasUnicodeRangeStart(input) {
  for (let index = 0; index + 1 < input.length; index++) {
    const token = input[index];
    if (
      token[0] === TokenType.Ident &&
      (token[1] === 'u' || token[1] === 'U') &&
      input[index + 1][1].startsWith('+')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * A custom property with a `U+` range may be read as `unicode-range` or as
 * anything else, and `u+1.0e2` is a range then a number in one, a single
 * number in the other, so no edit is safe for both. Before an edit the source
 * text is checked; after one, the tokens are, so the text is serialized only
 * when they may hold a range.
 *
 * @param {ValueBuffer} buffer
 * @return {boolean}
 */
export function containsUnicodeRange(buffer) {
  const mayStart = buffer.isEdited()
    ? hasUnicodeRangeStart(buffer.tokens())
    : /u\+/iv.test(buffer.text());
  if (!mayStart) return false;
  return tokens(buffer.text(), unicodeRangeOptions).some(
    (token) => token[0] === TokenType.UnicodeRange
  );
}
