import { inheritSupport } from './isFallback.js';

/**
 * @param {import('postcss').Rule} rule
 * @param {import('postcss').Declaration} decl
 * @param {Partial<import('postcss').DeclarationProps>=} props
 * @return {import('postcss').Declaration}
 */
function insertCloned(rule, decl, props) {
  const newNode = Object.assign(decl.clone(), props);

  rule.insertAfter(decl, newNode);
  // Propagate support context so cloned longhands preserve the
  // original declaration's applicability constraints.
  inheritSupport(decl, newNode);
  return newNode;
}

export default insertCloned;
