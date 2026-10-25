import { TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/** Tokens built here have no position in a source text. */
const noPosition = -1;

/**
 * The `:` token that separates a property from its value or a pseudo-class
 * from its name.
 *
 * @return {CSSToken}
 */
function colon() {
  return /** @type {CSSToken} */ ([
    TokenType.Colon,
    ':',
    noPosition,
    noPosition,
    undefined,
  ]);
}

/**
 * The `[` token that opens an attribute selector.
 *
 * @return {CSSToken}
 */
function openSquare() {
  return /** @type {CSSToken} */ ([
    TokenType.OpenSquare,
    '[',
    noPosition,
    noPosition,
    undefined,
  ]);
}

/**
 * The `]` token that closes an attribute selector.
 *
 * @return {CSSToken}
 */
function closeSquare() {
  return /** @type {CSSToken} */ ([
    TokenType.CloseSquare,
    ']',
    noPosition,
    noPosition,
    undefined,
  ]);
}

export { closeSquare, colon, openSquare };
