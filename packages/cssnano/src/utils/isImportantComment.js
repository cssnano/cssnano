import { TokenType } from './value.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * A comment whose text starts with `!` is the convention for licenses and notices
 * that minifiers keep.
 * @param {string} text comment text, excluding the delimiters
 * @return {boolean}
 */
function isImportantComment(text) {
  return text.startsWith('!');
}

/**
 * Whether a comment token is an important comment, for code that walks tokens
 * rather than PostCSS comment nodes.
 * @param {CSSToken} token
 * @return {boolean}
 */
export function isImportantCommentToken(token) {
  return token[0] === TokenType.Comment && token[1].startsWith('/*!');
}

export default isImportantComment;
