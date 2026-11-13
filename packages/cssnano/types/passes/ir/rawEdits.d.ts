/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex, BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {DeclarationRecord} from './declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
import type { BlockRecords } from './blockRecords.js';
import type { ArenaIndex, BlockRecord, NodeEntry } from './blockRecord.js';
import type { DeclarationRecord } from './declarationRecord.js';
import type { RuleRecord } from './ruleRecord.js';
/**
 * Writes the whitespace an entry prints before itself, or null for none, which
 * the printer infers. Write-back assigns it.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {string | null} before
 * @return {void}
 */
export declare function writeBefore(records: BlockRecords, index: ArenaIndex, before: string | null): void;
/**
 * Writes the whitespace the stylesheet prints before its first child, or null
 * when its node has none and the printer infers it.
 *
 * @param {BlockRecords} records
 * @param {string | null} leading
 * @return {void}
 */
export declare function writeLeadingWhitespace(records: BlockRecords, leading: string | null): void;
/**
 * Writes the whitespace the stylesheet prints after its last child.
 *
 * @param {BlockRecords} records
 * @param {string} after
 * @return {void}
 */
export declare function writeRootAfter(records: BlockRecords, after: string): void;
/**
 * Writes the separator between a declaration's or a rule's name and its value
 * or block, which the printer reads.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {string} between
 * @return {void}
 */
export declare function writeBetween(records: BlockRecords, index: ArenaIndex, between: string): void;
/**
 * Writes the spelling of a declaration's important flag, which the printer
 * reads when the declaration is important.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {string} spelling
 * @return {void}
 */
export declare function writeImportantSpelling(records: BlockRecords, index: ArenaIndex, spelling: string): void;
/**
 * Writes the spellings of a declaration that the printer reads: the separator
 * before its value, and the important flag's spelling when it is important.
 *
 * @param {DeclarationRecord} record
 * @param {string} between
 * @param {string | undefined} importantSpelling undefined keeps the spelling
 * @return {void}
 */
export declare function writeDeclarationRaws(record: DeclarationRecord, between: string, importantSpelling: string | undefined): void;
/**
 * Writes the spellings of a rule or an at-rule block that the printer reads.
 *
 * @param {RuleRecord | BlockRecord} record
 * @param {string} between
 * @param {string} after
 * @param {boolean} semicolon whether the block's last child takes a semicolon
 * @param {string | undefined} afterName undefined keeps the spelling of an at-rule's name
 * @return {void}
 */
export declare function writeBlockRaws(record: RuleRecord | BlockRecord, between: string, after: string, semicolon: boolean, afterName: string | undefined): void;
/**
 * Writes the spellings of an at-rule statement that the printer reads.
 *
 * @param {BlockRecord | NodeEntry} record
 * @param {string} between
 * @param {string | undefined} afterName undefined keeps the spelling
 * @return {void}
 */
export declare function writeStatementRaws(record: BlockRecord | NodeEntry, between: string, afterName: string | undefined): void;
//# sourceMappingURL=rawEdits.d.ts.map