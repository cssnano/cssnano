import { TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * The value as PostCSS parses it. A comment survives only between two tokens
 * that are neither spaces nor the edges of the value, and not after a comma.
 *
 * @param {readonly CSSToken[]} input
 * @return {string}
 */
export function parsedValueText(input) {
  let text = '';
  for (let index = 0; index < input.length; index++) {
    const token = input[index];
    if (token[0] !== TokenType.Comment) {
      text += token[1];
      continue;
    }
    const before = input[index - 1];
    const after = input[index + 1];
    if (isSpaceOrEdge(before) || isSpaceOrEdge(after) || text.endsWith(','))
      continue;
    text += token[1];
  }
  return text;
}

/**
 * @param {CSSToken | undefined} token
 * @return {boolean}
 */
function isSpaceOrEdge(token) {
  return token === undefined || token[0] === TokenType.Whitespace;
}
