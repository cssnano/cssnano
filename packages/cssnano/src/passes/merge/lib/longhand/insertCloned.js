import { insertAfter } from '../deferredChildEdits.js';
import { inheritSupport } from './isFallback.js';

/**
 * @param {import('postcss').Container} rule
 * @param {import('postcss').Declaration} decl
 * @param {Partial<import('postcss').DeclarationProps> | undefined} props
 * @param {import('../../../../values/textTable.js').TextTable} textTable
 * @return {import('postcss').Declaration}
 */
function insertCloned(rule, decl, props, textTable) {
  const newNode = Object.assign(decl.clone(), props);

  if (props?.value !== undefined || props?.prop !== undefined) {
    delete newNode.raws.value;
  }

  insertAfter(rule, decl, newNode);
  // Propagate support context so cloned longhands preserve the
  // original declaration's applicability constraints.
  inheritSupport(decl, newNode, textTable);
  return newNode;
}

export default insertCloned;
