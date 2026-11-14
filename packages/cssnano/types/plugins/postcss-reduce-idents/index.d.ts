import type { ArenaIndex } from '../../passes/ir/blockRecord.js';
import type { BlockRecords } from '../../passes/ir/blockRecords.js';
import type { RecordSymbolLists } from '../../pipeline/symbolLists.js';
import type { RunContext } from '../../passes/ir/runContext.js';
export type Options = {
    /**
     * Reduces `content`, `counter-reset` and `counter-increment` declarations. (default: true)
     */
    counter?: boolean;
    /**
     * Reduces `counter-style` rules and `list-style` and `system` declarations. (default: true)
     */
    counterStyle?: boolean;
    /**
     * Reduces `keyframes` rules and `animation` declarations. (default: true)
     */
    keyframes?: boolean;
    /**
     * Reduces `grid-template`, `grid-area`, `grid-column`, `grid-row` and `grid-template-areas` declarations. (default: true)
     */
    gridTemplate?: boolean;
    /**
     * Replaces a name. Receives the name and how many names came before it.
     */
    encoder?: (value: string, index: number) => string;
};
export type Reducer = {
    collect: (index: ArenaIndex, records: BlockRecords, context: RunContext) => void;
    transform: (records: BlockRecords, context: RunContext) => void;
};
/** @import {ArenaIndex} from '../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../passes/ir/blockRecords.js' */
/** @import {RecordSymbolLists} from '../../pipeline/symbolLists.js' */
/** @import {RunContext} from '../../passes/ir/runContext.js' */
/**
 * @typedef {object} Options
 * @property {boolean} [counter] Reduces `content`, `counter-reset` and `counter-increment` declarations. (default: true)
 * @property {boolean} [counterStyle] Reduces `counter-style` rules and `list-style` and `system` declarations. (default: true)
 * @property {boolean} [keyframes] Reduces `keyframes` rules and `animation` declarations. (default: true)
 * @property {boolean} [gridTemplate] Reduces `grid-template`, `grid-area`, `grid-column`, `grid-row` and `grid-template-areas` declarations. (default: true)
 * @property {(value: string, index: number) => string} [encoder] Replaces a name. Receives the name and how many names came before it.
 */
/** @typedef {{
 *    collect: (index: ArenaIndex, records: BlockRecords, context: RunContext) => void,
 *    transform: (records: BlockRecords, context: RunContext) => void
 *  }} Reducer
 */
/**
 * The reducers of the options, in the order they run. A plugin or preset
 * builds them once and keeps them across stylesheets, so stylesheets that one
 * processor minifies get distinct names and can share a page.
 *
 * @param {Options} options
 * @return {{reducers: Reducer[]}}
 */
export declare function createReducers({ counter, counterStyle, keyframes, gridTemplate, encoder, }: Options): {
    reducers: Reducer[];
};
/**
 * Renames the names that the walk up collected. Each reducer reads
 * only at-rules or declarations, so the lists hold every entry it needs, and an
 * entry that an earlier transform removed is skipped.
 *
 * @param {RecordSymbolLists} lists
 * @param {{reducers: Reducer[]}} state
 * @param {unknown} _remove
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @return {void}
 */
export declare function reduceIdentsSymbols(lists: RecordSymbolLists, { reducers }: {
    reducers: Reducer[];
}, _remove: unknown, records: BlockRecords, context: RunContext): void;
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