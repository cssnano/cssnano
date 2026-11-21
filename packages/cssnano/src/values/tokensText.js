import cssnanoUtils from '#utils';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

const { TokenType } = cssnanoUtils;

/**
 * The text a token list spells: each token's text, in order.
 *
 * @param {readonly CSSToken[]} list
 * @return {string}
 */
function tokensText(list) {
  let text = '';
  for (const token of list) text += token[1];
  return text;
}

/**
 * The text a token list spells without its comments, as PostCSS's cleaned
 * value and params leave them out. Whitespace stays, so callers trim it.
 *
 * @param {readonly CSSToken[]} list
 * @return {string}
 */
function commentFreeText(list) {
  let text = '';
  for (const token of list) {
    if (token[0] !== TokenType.Comment) text += token[1];
  }
  return text;
}

/**
 * Whether a token list spells nothing but whitespace and comments. PostCSS's
 * text of a value, selector or prelude leaves those out.
 *
 * @param {readonly CSSToken[]} list
 * @return {boolean}
 */
function isBlankTokens(list) {
  return list.every(
    (token) =>
      token[0] === TokenType.Whitespace || token[0] === TokenType.Comment
  );
}

export { tokensText, commentFreeText, isBlankTokens };
