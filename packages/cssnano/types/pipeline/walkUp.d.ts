import type { RunState } from '../passes/ir/runDriver.js';
import type { SymbolEntry } from './host.js';
/**
 * The walk up over the records, before the end of the run. The per-entry
 * transforms share one walk: normalizeWhitespace visits each entry, the symbol
 * lists and the charset scan collect what the later stage reads. With discardEmpty
 * on, the walk is post-order and discards empty entries; otherwise it is pre-order.
 * After the walk, the symbol transforms run in order over the lists, and then the
 * charset decision, all before the end writes the records.
 *
 * @param {RunState} state the build of the stylesheet, after the merge transforms
 * @param {ReadonlyMap<string, Record<PropertyKey, unknown>>} transforms the options of each transform on, by entry name
 * @param {ReadonlyMap<string, SymbolEntry>} symbols the advanced transforms on, in order
 * @param {readonly string[]} [browsers] the targets the merge folded the summaries for; absent when it did not
 * @return {void}
 */
export declare function walkUp(state: RunState, transforms: ReadonlyMap<string, Record<PropertyKey, unknown>>, symbols: ReadonlyMap<string, SymbolEntry>, browsers?: readonly string[]): void;
//# sourceMappingURL=walkUp.d.ts.map