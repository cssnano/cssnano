/** @import {ChildNode} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */
import type { BlockRecords } from './blockRecords.js';
import type { TextTable } from '../../../../values/textTable.js';
/**
 * Makes each node property and table read of the window throw, and returns a
 * function that restores them. A node keeps its own descriptor, or none when
 * it inherits the property.
 *
 * @param {BlockRecords} records
 * @param {TextTable} textTable
 * @return {() => void} restores the properties and the table
 */
export declare function guardWindow(records: BlockRecords, textTable: TextTable): () => void;
//# sourceMappingURL=windowGuard.d.ts.map