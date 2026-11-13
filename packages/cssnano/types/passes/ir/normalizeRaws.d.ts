import type { BlockRecords } from './blockRecords.js';
import type { ArenaIndex } from './blockRecord.js';
import type { TokenLists } from './tokenLists.js';
/**
 * Visits one entry: the whitespace before it, then its spellings. A comment
 * keeps its whitespace. `first` says the entry is the stylesheet's first child,
 * whose `leadingWhitespace` it trims too.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @param {boolean} first whether the entry is the first child of the stylesheet
 * @return {void}
 */
export declare function normalizeEntry(records: BlockRecords, tokenLists: TokenLists, index: ArenaIndex, first: boolean): void;
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