import { TokenType } from './value.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * Whether a layer block is anonymous: its prelude is blank, or holds only
 * comments. The prelude is the tokens of its params as PostCSS keeps them.
 *
 * @param {readonly CSSToken[]} prelude
 * @return {boolean}
 */
function isAnonymousLayer(prelude) {
  // The text is joined here, since values/tokensText.js reads this module's index.
  let text = '';
  for (const token of prelude) text += token[1];
  if (text.trim() === '') {
    return true;
  }
  if (!text.includes('/*')) {
    return false;
  }
  return !prelude.some((token) => token[0] === TokenType.Ident);
}

export default isAnonymousLayer;
