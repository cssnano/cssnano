import cssnanoUtils from 'cssnano-utils';
import { cssWideKeywords } from './spec.js';

const { asciiLowerCase } = cssnanoUtils;

/**
 * @param {string} value - a declaration value, in any letter case
 * @return {boolean} whether it is exactly one CSS-wide keyword
 */
export function isCssWideKeyword(value) {
  return cssWideKeywords.has(asciiLowerCase(value));
}
