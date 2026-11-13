import type { BlockRecords } from '../../passes/ir/blockRecords.js';
import type { RecordSymbolLists } from '../../pipeline/symbolLists.js';
import type { RunContext } from '../../passes/ir/runContext.js';
export type Options = {
    /**
     * The first positive integer z-index to assign, so z-indices from other sources can be overridden. (default: 1)
     */
    startIndex?: number;
};
/** @import {ArenaIndex} from '../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../passes/ir/blockRecords.js' */
/** @import {DeclarationRecord} from '../../passes/ir/declarationRecord.js' */
/** @import {RecordSymbolLists} from '../../pipeline/symbolLists.js' */
/** @import {RunContext} from '../../passes/ir/runContext.js' */
/**
 * @typedef {object} Options
 * @property {number} [startIndex] The first positive integer z-index to assign, so z-indices from other sources can be overridden. (default: 1)
 */
/**
 * Rebases the z-index values of the walk after merge's lists to small
 * integers that keep their order. Rebasing is only safe when every index is
 * a positive number, so one negative value leaves them all alone.
 *
 * @param {RecordSymbolLists} lists
 * @param {Options} options
 * @param {unknown} _remove
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @return {void}
 */
export declare function zindexSymbols(lists: RecordSymbolLists, options: Options, _remove: unknown, records: BlockRecords, context: RunContext): void;
/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
declare function pluginCreator(opts?: Options): import('postcss').Plugin;
declare namespace pluginCreator {
    var postcss: true;
}
declare const moduleExports: typeof pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
//# sourceMappingURL=index.d.ts.map