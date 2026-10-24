import { TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/** Tokens built here have no position in a source text. */
const noPosition = -1;

/**
 * A comma token, the separator of a list.
 *
 * @return {CSSToken}
 */
function comma() {
  return /** @type {CSSToken} */ ([
    TokenType.Comma,
    ',',
    noPosition,
    noPosition,
    undefined,
  ]);
}

export { comma };
