import cssnanoUtils from '#utils';

const { TokenType } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * The text of the tokens from `first` to `last`, both inclusive.
 *
 * @param {readonly CSSToken[]} tokens
 * @param {number} first the index of the first token, or -1 for no token
 * @param {number} last
 * @return {string}
 */
function textBetween(tokens, first, last) {
  if (first === -1) return '';
  let text = '';
  for (let index = first; index <= last; index++) text += tokens[index][1];
  return text;
}

/**
 * The items of a selector: its tokens split at the comma tokens outside every
 * parenthesis, each item trimmed of whitespace. A comment is one token, so a
 * comma inside it does not split. Empty items are kept, as PostCSS keeps them.
 *
 * @param {readonly CSSToken[]} tokens the selector's tokens, as written
 * @return {string[]}
 */
export function selectorItemsOf(tokens) {
  /** @type {string[]} */
  const items = [];
  let depth = 0;
  let first = -1;
  let last = -1;
  for (let index = 0; index < tokens.length; index++) {
    const type = tokens[index][0];
    if (depth === 0 && type === TokenType.Comma) {
      items.push(textBetween(tokens, first, last));
      first = -1;
      continue;
    }
    if (type === TokenType.Function || type === TokenType.OpenParen) depth++;
    else if (type === TokenType.CloseParen && depth > 0) depth--;
    if (type === TokenType.Whitespace || type === TokenType.EOF) continue;
    if (first === -1) first = index;
    last = index;
  }
  items.push(textBetween(tokens, first, last));
  return items;
}
