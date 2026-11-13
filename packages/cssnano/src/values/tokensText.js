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

export { tokensText, isBlankTokens };
