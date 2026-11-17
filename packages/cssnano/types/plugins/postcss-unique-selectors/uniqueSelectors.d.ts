import type { ArenaIndex } from '../../ir/blockRecord.js';
import type { BlockRecords } from '../../ir/blockRecords.js';
import type { RunContext } from '../../run/runContext.js';
/**
 * Removes the duplicate selectors of a rule and sorts the rest by key. The
 * first selector of each key is kept, with the comments of its duplicates
 * after it. The rule is marked only when its ids change.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index
 * @return {boolean} whether the rule's ids changed, which leaves its summaries stale
 */
export declare function uniqueRuleSelectors(records: BlockRecords, context: RunContext, index: ArenaIndex): boolean;
//# sourceMappingURL=uniqueSelectors.d.ts.map