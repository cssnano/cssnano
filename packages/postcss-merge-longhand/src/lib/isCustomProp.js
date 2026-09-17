import cssnanoUtils from 'cssnano-utils';

const { TokenType, asciiLowerCase, decoded, tokens } = cssnanoUtils;
/** @param {import('postcss').Declaration} node */
export default (node) => {
  if (!node.value.includes('--') && !node.value.includes('\\')) return false;
  const input = tokens(node.value);
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
};
