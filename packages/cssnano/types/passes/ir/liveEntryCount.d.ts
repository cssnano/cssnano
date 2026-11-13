import type { BlockRecords } from './blockRecords.js';
/** @import {BlockRecords} from './blockRecords.js' */
/**
 * The rules, at-rules and declarations on the live chains, which bound the
 * rounds of a run. Comments do not count, and an entry a detach took out of
 * the tree does not either, since the walk starts at the stylesheet.
 *
 * @param {BlockRecords} records
 * @return {number}
 */
export declare function liveEntryCount(records: BlockRecords): number;
//# sourceMappingURL=liveEntryCount.d.ts.map