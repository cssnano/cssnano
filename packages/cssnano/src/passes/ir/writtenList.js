import { DECLARATION, RULE } from './blockRecord.js';

/** @import {TokenListId} from './tokenLists.js' */
/** @import {BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {DeclarationRecord} from './declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

/**
 * The list a record's text is read from: its written list when it has one,
 * otherwise its identity list, which is the value list of a declaration and the
 * prelude of an at-rule. A rule's list is its written selector, which the build
 * sets; an edit that changed the rule's ids leaves none.
 *
 * @param {DeclarationRecord | RuleRecord | BlockRecord | NodeEntry} record
 * @return {TokenListId | -1}
 */
export function sourceListOf(record) {
  if (record.writtenList !== -1 || record.kind === RULE) {
    return /** @type {TokenListId | -1} */ (record.writtenList);
  }
  return record.kind === DECLARATION
    ? record.valueList
    : /** @type {TokenListId | -1} */ (record.preludeId);
}
