import cssnanoUtils from '#utils';

const { TokenType, asciiLowerCase, decoded } = cssnanoUtils;
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
    for (let next = index + 1; next < input.length; next++) {
      const child = input[next];
      if (child[0] === TokenType.Whitespace || child[0] === TokenType.Comment)
        continue;
      if (child[0] === TokenType.Ident) {
        if (decoded(child).startsWith('--')) return true;
        break;
      }
      break;
    }
  }
  return false;
}

/**
 * @param {import('postcss').Declaration} node
 * @param {import('../../../../values/textTable.js').TextTable} textTable the tokens the walk left for the declaration
 */
export default (node, textTable) => {
  if (!node.value.includes('--') && !node.value.includes('\\')) return false;
  return opensCustomPropertyVar(textTable.tokens(node));
};
