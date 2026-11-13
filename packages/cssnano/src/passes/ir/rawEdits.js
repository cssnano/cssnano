/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex, BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {DeclarationRecord} from './declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

/*
 * The edits of the spellings the printer reads: the whitespace before each entry,
 * the whitespace of the stylesheet's ends, and the separators of each kind of record.
 */

/**
 * Writes the whitespace an entry prints before itself, or null for none, which
 * the printer infers. Write-back assigns it.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {string | null} before
 * @return {void}
 */
export function writeBefore(records, index, before) {
  records.entry(index).before = before;
}

/**
 * Writes the whitespace the stylesheet prints before its first child, or null
 * when its node has none and the printer infers it.
 *
 * @param {BlockRecords} records
 * @param {string | null} leading
 * @return {void}
 */
export function writeLeadingWhitespace(records, leading) {
  records.leadingWhitespace = leading;
}

/**
 * Writes the whitespace the stylesheet prints after its last child.
 *
 * @param {BlockRecords} records
 * @param {string} after
 * @return {void}
 */
export function writeRootAfter(records, after) {
  records.root.after = after;
}

/**
 * Writes the separator before a declaration's value, which the printer reads.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {string} between
 * @return {void}
 */
export function writeBetween(records, index, between) {
  /** @type {DeclarationRecord} */ (records.entry(index)).between = between;
}

/**
 * Writes the spelling of a declaration's important flag, which the printer
 * reads when the declaration is important.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {string} spelling
 * @return {void}
 */
export function writeImportantSpelling(records, index, spelling) {
  /** @type {DeclarationRecord} */ (records.entry(index)).importantSpelling =
    spelling;
}

/**
 * Writes the spellings of a declaration that the printer reads: the separator
 * before its value, and the important flag's spelling when it is important.
 *
 * @param {DeclarationRecord} record
 * @param {string} between
 * @param {string | undefined} importantSpelling undefined keeps the spelling
 * @return {void}
 */
export function writeDeclarationRaws(record, between, importantSpelling) {
  record.between = between;
  if (importantSpelling !== undefined) {
    record.importantSpelling = importantSpelling;
  }
}

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
export function writeBlockRaws(record, between, after, semicolon, afterName) {
  record.between = between;
  record.after = after;
  record.semicolon = semicolon;
  if (afterName !== undefined) {
    /** @type {BlockRecord} */ (record).afterName = afterName;
  }
}

/**
 * Writes the spellings of an at-rule statement that the printer reads.
 *
 * @param {BlockRecord | NodeEntry} record
 * @param {string} between
 * @param {string | undefined} afterName undefined keeps the spelling
 * @return {void}
 */
export function writeStatementRaws(record, between, afterName) {
  record.between = between;
  if (afterName !== undefined) record.afterName = afterName;
}
