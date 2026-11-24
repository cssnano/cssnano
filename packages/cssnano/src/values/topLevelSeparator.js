import cssnanoUtils from '#utils';

const { TokenType } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * The index of the first token of type `separator`, at or after `start`, that
 * stands outside every pair of parentheses, or the token count when none
 * follows. A separator inside a function or a parenthesized block belongs to
 * the component around it.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {CSSToken[0]} separator
 * @return {number}
 */
export function topLevelSeparatorAt(tokens, start, separator) {
  let depth = 0;
  for (let index = start; index < tokens.length; index++) {
    const type = tokens[index][0];
    if (depth === 0 && type === separator) return index;
    if (type === TokenType.Function || type === TokenType.OpenParen) depth++;
    else if (type === TokenType.CloseParen && depth > 0) depth--;
  }
  return tokens.length;
}

/** @param {CSSToken} token */
function isEdgeTrivia(token) {
  return token[0] === TokenType.Whitespace || token[0] === TokenType.EOF;
}

/**
 * The index of the first token from `start` to before `end` that is neither
 * whitespace nor the end of the input, or `end` when there is none: where a
 * component's content begins once its leading whitespace is trimmed.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} start
 * @param {number} end
 * @return {number}
 */
export function contentStart(tokens, start, end) {
  let first = start;
  while (first < end && isEdgeTrivia(tokens[first])) first++;
  return first;
}

/**
 * One past the last token from `first` to before `end` that is neither
 * whitespace nor the end of the input, or `first` when there is none: where a
 * component's content ends once its trailing whitespace is trimmed.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} first
 * @param {number} end
 * @return {number}
 */
export function contentEnd(tokens, first, end) {
  let stop = end;
  while (stop > first && isEdgeTrivia(tokens[stop - 1])) stop--;
  return stop;
}
