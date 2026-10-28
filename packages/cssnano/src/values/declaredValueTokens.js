import cssnanoUtils from '#utils';
import { sourceValue } from '../utils/sourceText.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {TextTable} from './textTable.js' */
/** @import {Declaration} from 'postcss' */

/**
 * The tokens that spell a declaration's `decl.value`. PostCSS strips some
 * comments from the value, so the stored list may spell more than the value;
 * then the value is tokenized once, and a caller's cache keeps that list.
 *
 * @param {TextTable} textTable
 * @param {Declaration} decl
 * @param {Map<string, readonly CSSToken[]>} [cache] lists of `decl.value`
 * @return {readonly CSSToken[]}
 */
export function declaredValueTokens(textTable, decl, cache) {
  if (sourceValue(decl) === decl.value) return textTable.tokens(decl);
  let tokenized = cache?.get(decl.value);
  if (tokenized === undefined) {
    tokenized = cssnanoUtils.tokens(decl.value);
    cache?.set(decl.value, tokenized);
  }
  return tokenized;
}
