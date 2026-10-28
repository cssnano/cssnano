import cssnanoUtils from '#utils';

/**
 * Determines whether an @namespace declaration establishes a default namespace.
 * Under CSS Namespaces 3, a default namespace omits the <namespace-prefix>
 * identifier and immediately provides a <url> or <string>.
 *
 * Trivia tokens (whitespace and comments) are skipped according to CSS Syntax 3.
 *
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} prelude the
 *   tokens of the prelude
 * @return {boolean}
 */
export function isDefaultNamespace(prelude) {
  for (const token of prelude) {
    const type = token[0];
    if (
      type === cssnanoUtils.TokenType.Comment ||
      type === cssnanoUtils.TokenType.Whitespace
    ) {
      continue;
    }
    if (
      type === cssnanoUtils.TokenType.String ||
      type === cssnanoUtils.TokenType.URL
    ) {
      return true;
    }
    if (
      type === cssnanoUtils.TokenType.Function &&
      cssnanoUtils.asciiLowerCase(cssnanoUtils.decoded(token)) === 'url'
    ) {
      return true;
    }
    return false;
  }

  return false;
}
