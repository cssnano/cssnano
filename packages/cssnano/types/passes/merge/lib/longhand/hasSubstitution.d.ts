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
export default function hasSubstitution(value: string, tokens?: readonly import('@csstools/css-tokenizer').CSSToken[]): boolean;
//# sourceMappingURL=hasSubstitution.d.ts.map