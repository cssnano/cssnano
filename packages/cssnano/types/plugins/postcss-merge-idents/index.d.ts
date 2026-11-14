import type { ArenaIndex } from '../../passes/ir/blockRecord.js';
import type { BlockRecords } from '../../passes/ir/blockRecords.js';
import type { RecordSymbolLists } from '../../pipeline/symbolLists.js';
import type { RunContext } from '../../passes/ir/runContext.js';
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
/**
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map