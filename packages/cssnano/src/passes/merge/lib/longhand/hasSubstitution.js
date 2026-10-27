import { splitComponents } from './componentRanges.js';
import isCustomProp from './isCustomProp.js';
import { isSubstitution } from './unresolved.js';

/**
 * A substitution function such as `var()` or `env()` may stand for any number
 * of tokens, so a value that holds one cannot be split or collapsed.
 *
 * @param {string} value
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [tokens] the tokens
 * `value` spells
 * @return {boolean}
 */
export default function hasSubstitution(value, tokens) {
  return (
    isCustomProp(/** @type {import('postcss').Declaration} */ ({ value })) ||
    splitComponents(value, tokens).some((part) =>
      isSubstitution(part.tokens, part.start, part.end)
    )
  );
}
