import { TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * @param {readonly CSSToken[]} tokens
 * @param {number} index
 * @return {boolean}
 */
export function commentProvidesWhitespace(tokens, index) {
  // Comments are whitespace in selector grammar. Retain that whitespace in a
  // comparison key only when it separates two selector components.
  if (tokens[index - 1]?.[0] === TokenType.Comment) return false;

  let previous = index - 1;
  while (tokens[previous]?.[0] === TokenType.Comment) previous--;
  let next = index + 1;
  while (tokens[next]?.[0] === TokenType.Comment) next++;

  // The end of the selector text can end a component, as the end of input does.
  return (
    canEndSelectorComponent(tokens[previous]) &&
    (next >= tokens.length || canStartSelectorComponent(tokens[next]))
  );
}

/** @param {CSSToken | undefined} token @return {boolean} */
function canEndSelectorComponent(token) {
  if (!token) return false;
  if (
    [
      TokenType.Whitespace,
      TokenType.Comment,
      TokenType.Comma,
      TokenType.Function,
      TokenType.OpenParen,
      TokenType.OpenSquare,
      TokenType.OpenCurly,
      TokenType.Colon,
    ].includes(token[0])
  ) {
    return false;
  }
  return token[0] !== TokenType.Delim || !['>', '+', '~'].includes(token[1]);
}

/** @param {CSSToken | undefined} token @return {boolean} */
function canStartSelectorComponent(token) {
  if (!token) return false;
  if (
    [
      TokenType.Whitespace,
      TokenType.Comment,
      TokenType.Comma,
      TokenType.CloseParen,
      TokenType.CloseSquare,
      TokenType.CloseCurly,
    ].includes(token[0])
  ) {
    return false;
  }
  return token[0] !== TokenType.Delim || !['>', '+', '~'].includes(token[1]);
}
