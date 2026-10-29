/** @import {CSSToken} from '@csstools/css-tokenizer' */

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

export { tokensText };
