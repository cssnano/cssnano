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
  endsWithOpenEscape,
  normalizeAfterName,
  trimCustomPropertySeparator,
  trimSeparator,
  whitespaceRegex,
} from '../../values/rawSeparators.js';
import { isBlankTokens, tokensText } from '../../values/tokensText.js';

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex, BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {TokenListId, TokenLists} from './tokenLists.js' */

/**
 * The trimmed spelling of the important flag. A value that ends in an open
 * escape keeps one space before it, or the escape would take the `!`.
 *
 * @param {TokenLists} tokenLists
 * @param {import('./declarationRecord.js').DeclarationRecord} record
 * @return {string | undefined} undefined when the declaration is not important
 */
function importantSpelling(tokenLists, record) {
  if (!record.important) return undefined;
  return endsWithOpenEscape(tokensText(tokenLists.get(record.valueList)))
    ? ' !important'
    : '!important';
}

/**
 * The text a rule's or at-rule's raw separator follows: the last selector, or
 * the prelude.
 *

 * @param {TokenLists} tokenLists
 * @param {BlockRecord | NodeEntry | import('./ruleRecord.js').RuleRecord} record
 * @return {string}
 */
function headText(tokenLists, record) {
  if (record.kind === RULE) {
    const { selectorIds } =
      /** @type {import('./ruleRecord.js').RuleRecord} */ (record);
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
    /** @type {import('./declarationRecord.js').DeclarationRecord} */ (
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
  // Only an at-rule has an afterName; a rule's is undefined, as the node form leaves it.
  const named = /** @type {BlockRecord | NodeEntry} */ (record);
  const afterName =
    record.kind !== RULE && named.afterName !== null
      ? normalizeAfterName(named.afterName)
      : undefined;
  // A prelude that ends in an open escape keeps one space before the delimiter.
  const between = endsWithOpenEscape(
    headText(
      tokenLists,
      /** @type {BlockRecord | NodeEntry | import('./ruleRecord.js').RuleRecord} */ (
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
      /** @type {import('./ruleRecord.js').RuleRecord | import('./blockRecord.js').BlockRecord} */ (
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
 * keeps its whitespace. `first` says the entry is the stylesheet's first child,
 * whose `leadingWhitespace` it trims too.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @param {boolean} first whether the entry is the first child of the stylesheet
 * @return {void}
 */
export function normalizeEntry(records, tokenLists, index, first) {
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
