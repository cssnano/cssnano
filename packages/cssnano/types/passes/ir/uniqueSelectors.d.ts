import type { ArenaIndex } from './blockRecord.js';
import type { BlockRecords } from './blockRecords.js';
import type { RunContext } from './runContext.js';
/**
 * Removes the duplicate selectors of a rule and sorts the rest by key. The
 * first selector of each key is kept, with the comments of its duplicates
 * after it. The rule is marked only when its ids change.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index
 * @return {void}
 */
export declare function uniqueRuleSelectors(records: BlockRecords, context: RunContext, index: ArenaIndex): void;
//# sourceMappingURL=uniqueSelectors.d.ts.map