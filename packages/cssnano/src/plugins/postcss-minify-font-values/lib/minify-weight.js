import cssnanoUtils from '#utils';
import { integer } from '../../../values/tokenConstructors.js';

const { TokenType, asciiLowerCase, tokens } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * The font-weight value as tokens. Only a lone `normal` or `bold` changes.
 *
 * @param {readonly CSSToken[]} input
 * @return {CSSToken[]}
 */
function minifyWeightTokens(input) {
  if (input.length !== 1 || input[0][0] !== TokenType.Ident) return [...input];
  const lowerCasedValue = asciiLowerCase(input[0][1]);
  if (lowerCasedValue === 'normal') return [integer(400)];
  return lowerCasedValue === 'bold' ? [integer(700)] : [...input];
}

/**
 * @param {string} value
 * @return {string}
 */
function minifyWeight(value) {
  let text = '';
  for (const token of minifyWeightTokens(tokens(value))) text += token[1];
  return text;
}

export default minifyWeight;
export { minifyWeightTokens };
