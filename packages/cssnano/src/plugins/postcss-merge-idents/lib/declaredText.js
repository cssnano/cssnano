import cssnanoUtils from '#utils';
import { NO_PRELUDE } from '../../../passes/ir/blockRecord.js';
import { commentFreeText, tokensText } from '../../../values/tokensText.js';

const { tokens } = cssnanoUtils;

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {DeclarationRecord} from '../../../passes/ir/declarationRecord.js' */
/** @import {ArenaIndex} from '../../../passes/ir/blockRecord.js' */
/** @import {BlockRecord, NodeEntry} from '../../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../passes/ir/blockRecords.js' */
/** @import {TokenLists} from '../../../passes/ir/tokenLists.js' */

/**
 * The value a declaration holds, as PostCSS's `decl.value` spells it. A list
 * without comments is the value itself, and a list that keeps an important
 * comment spells the value without its comments, trimmed.
 *
 * @param {TokenLists} tokenLists
 * @param {DeclarationRecord} record
 * @return {string}
 */
export function declaredValue(tokenLists, record) {
  const list = tokenLists.get(record.valueList);
  const text = tokensText(list);
  const clean = commentFreeText(list);
  return clean === text ? text : clean.trim();
}

/**
 * The tokens that spell a declared value. A value list that spells the value
 * as written is the list itself; otherwise the value is tokenized once.
 *
 * @param {TokenLists} tokenLists
 * @param {DeclarationRecord} record
 * @param {string} value the result of `declaredValue`
 * @return {readonly CSSToken[]}
 */
export function declaredValueTokens(tokenLists, record, value) {
  const list = tokenLists.get(record.valueList);
  return tokensText(list) === value ? list : tokens(value);
}

/**
 * The record of an at-rule, which holds a name and a prelude.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @return {BlockRecord | NodeEntry}
 */
export function atRuleAt(records, index) {
  return /** @type {BlockRecord | NodeEntry} */ (records.entry(index));
}

/**
 * The tokens of an at-rule's prelude, empty when it has none.
 *
 * @param {TokenLists} tokenLists
 * @param {{preludeId: number}} entry
 * @return {readonly CSSToken[]}
 */
export function preludeListOf(tokenLists, entry) {
  return entry.preludeId === NO_PRELUDE
    ? []
    : tokenLists.get(
        /** @type {import('../../../passes/ir/tokenLists.js').TokenListId} */ (
          entry.preludeId
        )
      );
}

/**
 * The prelude of an at-rule as PostCSS's `params` spells it, which the list
 * holds as interned.
 *
 * @param {TokenLists} tokenLists
 * @param {{preludeId: number}} entry
 * @return {string}
 */
export function preludeTextOf(tokenLists, entry) {
  return tokensText(preludeListOf(tokenLists, entry));
}
