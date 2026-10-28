import type { TextTable } from '../values/textTable.js';
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
declare function isAnonymousLayer(node: import('postcss').AtRule, table: TextTable): boolean;
export default isAnonymousLayer;
//# sourceMappingURL=isAnonymousLayer.d.ts.map