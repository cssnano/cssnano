import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  COMMENT,
  DECLARATION,
  RULE,
} from './blockRecord.js';
import {
  writeBefore,
  writeBlockRaws,
  writeDeclarationRaws,
  writeLeadingWhitespace,
  writeRootAfter,
  writeStatementRaws,
} from './rawEdits.js';
import {
  normalizeAfterName,
  trimCustomPropertySeparator,
  trimSeparator,
  whitespaceRegex,
} from '../../values/rawSeparators.js';
import { isBlankTokens } from '../../values/tokensText.js';

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex, BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {TokenLists} from './tokenLists.js' */

/**
 * Trims the whitespace of one declaration's spellings. A custom property keeps
 * its separator as it is when its value is blank.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @return {void}
 */
function normalizeDeclaration(records, tokenLists, index) {
  const record =
    /** @type {import('./declarationRecord.js').DeclarationRecord} */ (
      records.entry(index)
    );
  const between = record.between || ':';
  if (!record.prop.startsWith('--')) {
    writeDeclarationRaws(
      record,
      trimSeparator(between),
      record.important ? '!important' : undefined
    );
  } else if (!isBlankTokens(tokenLists.get(record.valueList))) {
    writeDeclarationRaws(
      record,
      trimCustomPropertySeparator(between),
      undefined
    );
  }
}

/**
 * Trims the separators of one entry that is a rule, a block or a statement.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @return {void}
 */
function normalizeAtRuleOrRule(records, index) {
  const record = records.entry(index);
  // Only an at-rule has an afterName; a rule's is undefined, as the node form leaves it.
  const named = /** @type {BlockRecord | NodeEntry} */ (record);
  const afterName =
    record.kind !== RULE && named.afterName !== null
      ? normalizeAfterName(named.afterName)
      : undefined;
  if (record.kind === AT_RULE_STATEMENT) {
    writeStatementRaws(record, '', afterName);
  } else {
    writeBlockRaws(
      /** @type {import('./ruleRecord.js').RuleRecord | import('./blockRecord.js').BlockRecord} */ (
        record
      ),
      '',
      '',
      false,
      afterName
    );
  }
}

/**
 * Visits one entry: the whitespace before it, then its spellings. A comment
 * keeps its whitespace.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @param {boolean} first whether the entry is the first child of the stylesheet
 * @return {void}
 */
function normalizeEntry(records, tokenLists, index, first) {
  const record = records.entry(index);
  if (record.kind === COMMENT) return;
  if (record.before) {
    const before = record.before.replaceAll(whitespaceRegex, '');
    writeBefore(records, index, before);
    if (first && records.leadingWhitespace !== null) {
      writeLeadingWhitespace(
        records,
        records.leadingWhitespace.replaceAll(whitespaceRegex, '')
      );
    }
  }
  if (record.kind === DECLARATION) {
    normalizeDeclaration(records, tokenLists, index);
  } else {
    normalizeAtRuleOrRule(records, index);
  }
}

/**
 * Visits the children of a container in pre-order: each entry, then the entries
 * of its children. A rule or block is a container; a statement is not.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} container
 * @param {boolean} isRoot whether the container is the stylesheet
 * @return {void}
 */
function normalizeChildren(records, tokenLists, container, isRoot) {
  const { links } = records;
  let first = true;
  for (
    let entry = links.firstChild(container);
    entry !== -1;
    entry = links.nextSibling(entry)
  ) {
    normalizeEntry(records, tokenLists, entry, isRoot && first);
    first = false;
    const { kind } = records.entry(entry);
    if (kind === RULE || kind === AT_RULE_BLOCK) {
      normalizeChildren(records, tokenLists, entry, false);
    }
  }
}

/**
 * Trims the whitespace of each entry of the stylesheet that normalizeWhitespace
 * trims, in pre-order, and the stylesheet's own trailing whitespace.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @return {void}
 */
export function normalizeRecordRaws(records, tokenLists) {
  normalizeChildren(records, tokenLists, records.root.index, true);
  writeRootAfter(records, '');
}
