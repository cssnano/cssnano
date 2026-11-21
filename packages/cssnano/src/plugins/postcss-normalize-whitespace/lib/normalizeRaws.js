import cssnanoUtils from '#utils';
import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  COMMENT,
  DECLARATION,
  RULE,
} from '../../../ir/blockRecord.js';
import {
  writeBefore,
  writeBlockRaws,
  writeDeclarationRaws,
  writeRootAfter,
  writeStatementRaws,
} from '../../../ir/rawEdits.js';
import {
  normalizeAfterName,
  trimCustomPropertySeparator,
  trimSeparator,
  whitespaceRegex,
} from '../../../values/rawSeparators.js';
import { isBlankTokens, tokensText } from '../../../values/tokensText.js';

const { endsWithEscapingBackslash } = cssnanoUtils;

/** @import {BlockRecords} from '../../../ir/blockRecords.js' */
/** @import {ArenaIndex, BlockRecord, NodeEntry} from '../../../ir/blockRecord.js' */
/** @import {TokenListId, TokenLists} from '../../../ir/tokenLists.js' */

/**
 * The trimmed spelling of the important flag. A value that ends in an open
 * escape keeps one space before it, or the escape would take the `!`.
 *
 * @param {TokenLists} tokenLists
 * @param {import('../../../ir/declarationRecord.js').DeclarationRecord} record
 * @return {string | undefined} undefined when the declaration is not important
 */
function importantSpelling(tokenLists, record) {
  if (!record.important) return undefined;
  return endsWithEscapingBackslash(tokensText(tokenLists.get(record.valueList)))
    ? ' !important'
    : '!important';
}

/**
 * The text a rule's or at-rule's raw separator follows: the last selector, or
 * the prelude.
 *

 * @param {TokenLists} tokenLists
 * @param {BlockRecord | NodeEntry | import('../../../ir/ruleRecord.js').RuleRecord} record
 * @return {string}
 */
function headText(tokenLists, record) {
  if (record.kind === RULE) {
    const { selectorIds } =
      /** @type {import('../../../ir/ruleRecord.js').RuleRecord} */ (record);
    const last = selectorIds[selectorIds.length - 1];
    return last === undefined ? '' : tokensText(tokenLists.get(last));
  }
  const { preludeId } = /** @type {BlockRecord | NodeEntry} */ (record);
  return preludeId === -1
    ? ''
    : tokensText(tokenLists.get(/** @type {TokenListId} */ (preludeId)));
}

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
    /** @type {import('../../../ir/declarationRecord.js').DeclarationRecord} */ (
      records.entry(index)
    );
  const between = record.between || ':';
  if (!record.prop.startsWith('--')) {
    writeDeclarationRaws(
      record,
      trimSeparator(between),
      importantSpelling(tokenLists, record)
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
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @return {void}
 */
function normalizeAtRuleOrRule(records, tokenLists, index) {
  const record = records.entry(index);
  // Only an at-rule has an afterName; a rule's stays undefined.
  const named = /** @type {BlockRecord | NodeEntry} */ (record);
  const afterName =
    record.kind !== RULE && named.afterName !== null
      ? normalizeAfterName(named.afterName)
      : undefined;
  // A prelude that ends in an open escape keeps one space before the delimiter.
  const between = endsWithEscapingBackslash(
    headText(
      tokenLists,
      /** @type {BlockRecord | NodeEntry | import('../../../ir/ruleRecord.js').RuleRecord} */ (
        record
      )
    )
  )
    ? ' '
    : '';
  if (record.kind === AT_RULE_STATEMENT) {
    writeStatementRaws(record, between, afterName);
  } else {
    writeBlockRaws(
      /** @type {import('../../../ir/ruleRecord.js').RuleRecord | import('../../../ir/blockRecord.js').BlockRecord} */ (
        record
      ),
      between,
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
 * @return {void}
 */
export function normalizeEntry(records, tokenLists, index) {
  const record = records.entry(index);
  if (record.kind === COMMENT) return;
  if (record.before) {
    const before = record.before.replaceAll(whitespaceRegex, '');
    writeBefore(records, index, before);
  }
  if (record.kind === DECLARATION) {
    normalizeDeclaration(records, tokenLists, index);
  } else {
    normalizeAtRuleOrRule(records, tokenLists, index);
  }
}

/**
 * Visits the children of a container in pre-order: each entry, then the entries
 * of its children. A rule or block is a container; a statement is not.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} container
 * @return {void}
 */
function normalizeChildren(records, tokenLists, container) {
  const { links } = records;
  for (
    let entry = links.firstChild(container);
    entry !== -1;
    entry = links.nextSibling(entry)
  ) {
    normalizeEntry(records, tokenLists, entry);
    const { kind } = records.entry(entry);
    if (kind === RULE || kind === AT_RULE_BLOCK) {
      normalizeChildren(records, tokenLists, entry);
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
  normalizeChildren(records, tokenLists, records.root.index);
  writeRootAfter(records, '');
}
