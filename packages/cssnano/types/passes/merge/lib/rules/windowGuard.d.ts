/** @import {TextTable} from '../../../../values/textTable.js' */
import type { TextTable } from '../../../../values/textTable.js';
/**
 * Makes each table read of the window throw, and returns a function that
 * restores them.
 *
 * @param {TextTable} textTable
 * @return {() => void} restores the table
 */
export declare function guardWindow(textTable: TextTable): () => void;
//# sourceMappingURL=windowGuard.d.ts.map