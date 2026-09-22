import cssnanoUtils from 'cssnano-utils';

/**
 * Determines whether an @namespace declaration establishes a default namespace.
 * Under CSS Namespaces 3, a default namespace omits the <namespace-prefix>
 * identifier and immediately provides a <url> or <string>.
 *
 * Trivia tokens (whitespace and comments) are skipped according to CSS Syntax 3.
 *
 * @param {string} [params]
 * @return {boolean}
 */
export function isDefaultNamespace(params) {
  if (!params) {
    return false;
  }

  for (const token of cssnanoUtils.tokens(params)) {
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
      cssnanoUtils.decoded(token).toLowerCase() === 'url'
    ) {
      return true;
    }
    return false;
  }

  return false;
}
