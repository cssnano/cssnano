import type { BlockRecords } from './blockRecords.js';
import type { RunContext } from './runContext.js';
import type { ArenaIndex } from './blockRecord.js';
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {DeclarationRecord} from './declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {RunContext} from './runContext.js' */
/** @import {TokenListId} from './tokenLists.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** The name that the discardEmpty messages carry. */
export declare const DISCARD_PLUGIN = "postcss-discard-empty";
export type EntryVisitor = {
    enter(index: ArenaIndex): void;
    visit(index: ArenaIndex): void;
};
/**
 * Discards the empty entries of the stylesheet, and records each removal as a
 * message. `visitor` runs on each kept entry, after its children, so another
 * per-entry transform can share this walk.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {EntryVisitor} [visitor]
 * @return {void}
 */
export declare function discardEmptyRecords(records: BlockRecords, context: RunContext, visitor?: EntryVisitor): void;
/**
 * Removes an entry that a transform no longer needs, then each ancestor the
 * removal empties, reporting each ancestor. An emptied named layer stays: it may
 * fix the order of its layer.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index
 * @return {void}
 */
export declare function removeAndDiscardEmptiedRecords(records: BlockRecords, context: RunContext, index: ArenaIndex): void;
//# sourceMappingURL=discardRecords.d.ts.map