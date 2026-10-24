import { TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * The tokens of the value as PostCSS parses it. A comment survives only
 * between two tokens that are neither spaces nor the edges of the value, and
 * not after a comma.
 *
 * @param {readonly CSSToken[]} input
 * @return {CSSToken[]}
 */
export function parsedValueTokens(input) {
  const kept = [];
  for (let index = 0; index < input.length; index++) {
    const token = input[index];
    if (token[0] !== TokenType.Comment) {
      kept.push(token);
      continue;
    }
    const before = input[index - 1];
    const after = input[index + 1];
    if (
      isSpaceOrEdge(before) ||
      isSpaceOrEdge(after) ||
      kept.at(-1)?.[1].endsWith(',')
    )
      continue;
    kept.push(token);
  }
  return kept;
}

/**
 * The text of the value as PostCSS parses it.
 *
 * @param {readonly CSSToken[]} input
 * @return {string}
 */
export function parsedValueText(input) {
  let text = '';
  for (const token of parsedValueTokens(input)) text += token[1];
  return text;
}

/**
 * @param {CSSToken | undefined} token
 * @return {boolean}
 */
function isSpaceOrEdge(token) {
  return token === undefined || token[0] === TokenType.Whitespace;
}
