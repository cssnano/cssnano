import type { BlockRecords } from '../../ir/blockRecords.js';
import type { RecordSymbolLists } from '../../run/symbolLists.js';
import type { RunContext } from '../../run/runContext.js';
export type Options = {
    /**
     * The first positive integer z-index to assign, so z-indices from other sources can be overridden. (default: 1)
     */
    startIndex?: number;
};
/** @import {ArenaIndex} from '../../ir/blockRecord.js' */
/** @import {BlockRecords} from '../../ir/blockRecords.js' */
/** @import {DeclarationRecord} from '../../ir/declarationRecord.js' */
/** @import {RecordSymbolLists} from '../../run/symbolLists.js' */
/** @import {RunContext} from '../../run/runContext.js' */
/**
 * @typedef {object} Options
 * @property {number} [startIndex] The first positive integer z-index to assign, so z-indices from other sources can be overridden. (default: 1)
 */
/**
 * Rebases the z-index values of the walk up's lists to small
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
//# sourceMappingURL=index.d.ts.map