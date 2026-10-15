import { TokenType, tokens } from './value.js';

/**
 * @param {import('postcss').AtRule} node
 * @return {boolean}
 */
function isAnonymousLayer(node) {
  const params = node.params?.trim();
  if (!params) {
    return true;
  }
  if (!params.includes('/*')) {
    return false;
  }
  return !tokens(params).some((token) => token[0] === TokenType.Ident);
}

export default isAnonymousLayer;
