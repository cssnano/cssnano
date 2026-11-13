import type { Result, Root } from 'postcss';
import type { NodeTable } from '../passes/ir/nodeTable.js';
import type { RunState } from '../passes/ir/runDriver.js';
import type { SymbolEntry } from './host.js';
import type { RecordSymbolLists } from './symbolLists.js';
import type { TextTable } from '../values/textTable.js';
export type AfterWalk = {
    symbolsOn: boolean;
    lists: RecordSymbolLists | undefined;
    scan: import('../passes/ir/charset.js').CharsetScan;
    charsetOptions: Record<PropertyKey, unknown> | undefined;
};
/**
 * The walk after merge over the records, before the end of the run. The per-entry
 * transforms share one walk: normalizeWhitespace visits each entry, the symbol
 * lists and the charset scan collect what the later stage reads. With discardEmpty
 * on, the walk is post-order and discards empty entries; otherwise it is pre-order.
 * The advanced transforms over the records run after the walk, in order, and
 * the rest run over the nodes after the end.
 *
 * @param {RunState} state the build of the stylesheet, after the merge transforms
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms the options of each transform on, by entry name
 * @param {ReadonlyMap<string, SymbolEntry>} symbols the advanced transforms on, in order
 * @param {readonly string[]} [browsers] the targets the merge folded the summaries for; absent when it did not
 * @return {AfterWalk}
 */
export declare function walkAfterMerge(state: RunState, transforms: ReadonlyMap<string, Record<PropertyKey, unknown>>, symbols: ReadonlyMap<string, SymbolEntry>, browsers?: readonly string[]): AfterWalk;
/**
 * The stage after the end of the run, on the nodes the end wrote: the advanced
 * transforms over the nodes, the charset decision, then the raw cache, which
 * records last so that no later transform changes what it describes.
 *
 * @param {Root} root
 * @param {Result} result
 * @param {NodeTable} nodes the node of each entry, from the end of the run
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms
 * @param {ReadonlyMap<string, SymbolEntry>} symbols
 * @param {TextTable} table the selectors and declarations the walk before merge stored
 * @param {AfterWalk} walked what the walk over the records left
 * @returns {void}
 */
export declare function finishAfterMerge(root: Root, result: Result, nodes: NodeTable, transforms: ReadonlyMap<string, Record<PropertyKey, unknown>>, symbols: ReadonlyMap<string, SymbolEntry>, table: TextTable, walked: AfterWalk): void;
//# sourceMappingURL=afterMerge.d.ts.map