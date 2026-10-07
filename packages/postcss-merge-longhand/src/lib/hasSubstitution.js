import { list } from 'postcss';
import isCustomProp from './isCustomProp.js';
import { isSubstitution } from './unresolved.js';

/**
 * A substitution function such as `var()` or `env()` may stand for any number
 * of tokens, so a value that holds one cannot be split or collapsed.
 *
 * @param {string} value
 * @return {boolean}
 */
export default function hasSubstitution(value) {
  return (
    isCustomProp(/** @type {import('postcss').Declaration} */ ({ value })) ||
    list.space(value).some(isSubstitution)
  );
}
