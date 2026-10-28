import { TokenType } from './value.js';

/** @import {TextTable} from '../values/textTable.js' */

/**
 * Whether a layer block is anonymous: its prelude is empty, or holds only
 * comments. A prelude with a comment is read from the table, which keeps the
 * tokens the walk stored for it.
 *
 * @param {import('postcss').AtRule} node
 * @param {TextTable} table
 * @return {boolean}
 */
function isAnonymousLayer(node, table) {
  const params = node.params?.trim();
  if (!params) {
    return true;
  }
  if (!params.includes('/*')) {
    return false;
  }
  return !table.tokens(node).some((token) => token[0] === TokenType.Ident);
}

export default isAnonymousLayer;
