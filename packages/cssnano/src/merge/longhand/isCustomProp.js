import cssnanoUtils from '#utils';

const { TokenType, asciiLowerCase, decoded, skipTrivia } = cssnanoUtils;
/**
 * Whether a `var()` in the tokens names a custom property.
 *
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} input
 * @return {boolean}
 */
export function opensCustomPropertyVar(input) {
  for (let index = 0; index < input.length; index++) {
    const token = input[index];
    if (
      token[0] !== TokenType.Function ||
      asciiLowerCase(decoded(token)) !== 'var'
    )
      continue;
    const child = input[skipTrivia(input, index + 1)];
    if (child?.[0] === TokenType.Ident && decoded(child).startsWith('--')) {
      return true;
    }
  }
  return false;
}

/**
 * @param {import('./blockDeclarations.js').DeclarationItem} node
 */
export default (node) => {
  if (!node.value.includes('--') && !node.value.includes('\\')) return false;
  return opensCustomPropertyVar(node.tokens);
};
