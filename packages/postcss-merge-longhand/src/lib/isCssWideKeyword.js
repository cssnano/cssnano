import { cssWideKeywords } from './spec.js';

/**
 * @param {string} value - a declaration value, in any letter case
 * @return {boolean} whether it is exactly one CSS-wide keyword
 */
export function isCssWideKeyword(value) {
  return cssWideKeywords.has(value.toLowerCase());
}
