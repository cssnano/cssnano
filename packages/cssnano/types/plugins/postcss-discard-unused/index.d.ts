import type { ArenaIndex } from '../../ir/blockRecord.js';
import type { BlockRecords } from '../../ir/blockRecords.js';
import type { RunContext } from '../../run/runContext.js';
import type { RecordSymbolLists } from '../../run/symbolLists.js';
export type Options = {
    /**
     * Discards unused font face rules. (default: true)
     */
    fontFace?: boolean;
    /**
     * Discards unused counter style rules. (default: true)
     */
    counterStyle?: boolean;
    /**
     * Discards unused keyframe rules. (default: true)
     */
    keyframes?: boolean;
    /**
     * Discards unused namespace rules. (default: true)
     */
    namespace?: boolean;
};
/**
 * @typedef {object} Options
 * @property {boolean} [fontFace] Discards unused font face rules. (default: true)
 * @property {boolean} [counterStyle] Discards unused counter style rules. (default: true)
 * @property {boolean} [keyframes] Discards unused keyframe rules. (default: true)
 * @property {boolean} [namespace] Discards unused namespace rules. (default: true)
 */
/**
 * Removes the at-rules that define a name nothing references. Every reference
 * is read before the first removal, so a reference inside a removed at-rule
 * still keeps its definition, except that a counter style used only by unused
 * counter styles goes too.
 *
 * @param {RecordSymbolLists} lists
 * @param {Options} options
 * @param {(index: ArenaIndex) => void} remove
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @return {void}
 */
export declare function discardUnusedSymbols(lists: RecordSymbolLists, options: Options, remove: (index: ArenaIndex) => void, records: BlockRecords, context: RunContext): void;
//# sourceMappingURL=index.d.ts.map