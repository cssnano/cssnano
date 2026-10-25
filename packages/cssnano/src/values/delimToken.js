import { TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/** Tokens built here have no position in a source text. */
const noPosition = -1;

/**
 * A delim token, one character that is no other token, such as `/`.
 *
 * @param {string} character a single code point
 * @return {CSSToken}
 */
function delim(character) {
  if ([...character].length !== 1) {
    throw new RangeError(`${character} is not one character`);
  }
  return /** @type {CSSToken} */ ([
    TokenType.Delim,
    character,
    noPosition,
    noPosition,
    { value: character },
  ]);
}

export { delim };
