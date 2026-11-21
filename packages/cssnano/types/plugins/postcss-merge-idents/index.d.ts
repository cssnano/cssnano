import type { ArenaIndex } from '../../ir/blockRecord.js';
import type { BlockRecords } from '../../ir/blockRecords.js';
import type { RecordSymbolLists } from '../../run/symbolLists.js';
import type { RunContext } from '../../run/runContext.js';
/**
 * Merges the names of the advanced transform's lists. The walk up
 * collects the lists, so the transform needs no walk of its own.
 *
 * @param {RecordSymbolLists} lists
 * @param {Record<PropertyKey, unknown>} _options takes no options
 * @param {(index: ArenaIndex) => void} remove
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @return {void}
 */
export declare function mergeIdentsSymbols(lists: RecordSymbolLists, _options: Record<PropertyKey, unknown>, remove: (index: ArenaIndex) => void, records: BlockRecords, context: RunContext): void;
//# sourceMappingURL=index.d.ts.map