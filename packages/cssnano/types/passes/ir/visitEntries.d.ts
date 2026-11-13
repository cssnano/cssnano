import type { ArenaIndex } from './blockRecord.js';
import type { BlockRecords } from './blockRecords.js';
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/**
 * Visits every entry under `container` in pre-order: each entry, then the
 * entries of its children. The next sibling is read before an entry is
 * visited, so a visit may remove it.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} container
 * @param {(index: ArenaIndex) => void} visit
 * @return {void}
 */
export declare function visitEntriesInOrder(records: BlockRecords, container: ArenaIndex, visit: (index: ArenaIndex) => void): void;
//# sourceMappingURL=visitEntries.d.ts.map