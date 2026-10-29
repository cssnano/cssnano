import { splitComponents, valueTokens } from './componentRanges.js';
import { opensCustomPropertyVar } from './isCustomProp.js';
import { isSubstitution } from './unresolved.js';

/**
 * A substitution function such as `var()` or `env()` may stand for any number
 * of tokens, so a value that holds one cannot be split or collapsed. A custom
 * property is one such `var()`, so the value's tokens decide it too.
 *
 * @param {string} value
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [tokens] the
 * tokens `value` spells
 * @return {boolean}
 */
export default function hasSubstitution(value, tokens) {
  const spelled = valueTokens(value, tokens);
  return (
    ((value.includes('--') || value.includes('\\')) &&
      spelled !== undefined &&
      opensCustomPropertyVar(spelled)) ||
    splitComponents(value, spelled).some((part) =>
      isSubstitution(part.list, part.start, part.end)
    )
  );
}
