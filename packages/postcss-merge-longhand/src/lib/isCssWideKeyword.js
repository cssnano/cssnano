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

/**
 * A shorthand holds one CSS-wide keyword for all its slots, or none of them.
 *
 * @param {string[]} values - the slot values in order
 * @return {boolean} whether the values can share one shorthand value
 */
export function sharesShorthandKeyword(values) {
  const [first] = values;
  const wide = isCssWideKeyword(first);
  return values.every(
    (value) =>
      isCssWideKeyword(value) === wide &&
      (!wide || asciiLowerCase(value) === asciiLowerCase(first))
  );
}
