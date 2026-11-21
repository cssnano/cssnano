import type { BlockRecords } from '../../../ir/blockRecords.js';
import type { ArenaIndex } from '../../../ir/blockRecord.js';
import type { TokenLists } from '../../../ir/tokenLists.js';
/**
 * Visits one entry: the whitespace before it, then its spellings. A comment
 * keeps its whitespace.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @return {void}
 */
export declare function normalizeEntry(records: BlockRecords, tokenLists: TokenLists, index: ArenaIndex): void;
/**
 * Trims the whitespace of each entry of the stylesheet that normalizeWhitespace
 * trims, in pre-order, and the stylesheet's own trailing whitespace.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @return {void}
 */
export declare function normalizeRecordRaws(records: BlockRecords, tokenLists: TokenLists): void;
//# sourceMappingURL=normalizeRaws.d.ts.map