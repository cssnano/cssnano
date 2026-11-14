import type { BlockRecords } from './blockRecords.js';
import type { ArenaIndex } from './blockRecord.js';
import type { RunContext } from './runContext.js';
import type { DeclarationRecord } from './declarationRecord.js';
export type CharsetScan = {
    first: ArenaIndex;
    charsets: ArenaIndex[];
    nonAscii: ArenaIndex;
    candidates?: ArenaIndex[];
};
/**
 * What the charset decision reads from a walk: the first `@charset`, every
 * top-level `@charset` in visit order, and the first top-level entry with
 * non-ASCII text, each an arena index or -1 for none. `candidates`, when set,
 * records every such entry, for a run whose transforms may remove that text
 * after the walk.
 *
 * @typedef {object} CharsetScan
 * @property {ArenaIndex} first
 * @property {ArenaIndex[]} charsets
 * @property {ArenaIndex} nonAscii
 * @property {ArenaIndex[]} [candidates]
 */
/**
 * @param {boolean} [keepCandidates] whether to record every entry with non-ASCII text
 * @return {CharsetScan}
 */
export declare function createCharsetScan(keepCandidates?: boolean): CharsetScan;
/**
 * Whether a declaration's value as written holds non-ASCII text. The written
 * list is set only when the value list drops text the author wrote, such as a
 * plain comment, so the check reads a value kept as written through its value
 * list instead.
 *
 * @param {RunContext} context
 * @param {DeclarationRecord} record
 * @return {boolean}
 */
export declare function writtenTextHoldsNonAscii(context: RunContext, record: DeclarationRecord): boolean;
/**
 * Whether an entry or any entry below it holds non-ASCII text. Stops at the
 * first hit.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index
 * @return {boolean}
 */
export declare function entryHoldsNonAscii(records: BlockRecords, context: RunContext, index: ArenaIndex): boolean;
/**
 * Records what the charset decision needs from one entry. A nested `@charset`
 * is removed as it is visited, so a walk that discards empty containers after
 * their children also discards one that held only a charset.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index
 * @param {CharsetScan} scan
 * @return {void}
 */
export declare function charsetVisit(records: BlockRecords, context: RunContext, index: ArenaIndex, scan: CharsetScan): void;
/**
 * Finds the first candidate that is still at the top and still has non-ASCII
 * text, once the transforms after the walk have removed what they remove.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {CharsetScan} scan
 * @return {void}
 */
export declare function rescanNonAscii(records: BlockRecords, context: RunContext, scan: CharsetScan): void;
/**
 * Removes the top-level charsets. A stylesheet with non-ASCII text keeps the
 * first charset at the top, or adds one when `add` is not false. The new
 * entry takes the first charset's prelude and spellings, and the template of
 * the first entry with non-ASCII text, whose source its node takes. The
 * separator after the first charset is read before the removal.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {CharsetScan} scan
 * @param {{add?: boolean}} opts
 * @return {void}
 */
export declare function decideCharset(records: BlockRecords, context: RunContext, scan: CharsetScan, opts: {
    add?: boolean;
}): void;
//# sourceMappingURL=charset.d.ts.map