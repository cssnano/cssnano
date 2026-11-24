import cssnanoUtils from '#utils';
import { tokenize } from '@csstools/css-tokenizer';
import { headText } from '../../ir/headText.js';
import { writeBetween } from '../../ir/rawEdits.js';
import { replaceComments } from './replaceComments.js';

/** @import {ArenaIndex, BlockRecord, NodeEntry} from '../../ir/blockRecord.js' */
/** @import {BlockRecords} from '../../ir/blockRecords.js' */
/** @import {RuleRecord} from '../../ir/ruleRecord.js' */
/** @import {CommentState} from './commentState.js' */

/**
 * Removes the comments in the gap between a rule's or at-rule's prelude and
 * its block. A newline after a final backslash stays: it makes the backslash an
 * invalid escape, where the next character would otherwise be escaped. A gap
 * that starts with a slash after an open escape is left as written.
 *
 * @param {BlockRecords} records
 * @param {import('../../ir/tokenLists.js').TokenLists} tokenLists
 * @param {ArenaIndex} index
 * @param {CommentState} comments
 */
export function removeBetween(records, tokenLists, index, comments) {
  const record = /** @type {BlockRecord | NodeEntry | RuleRecord} */ (
    records.entry(index)
  );
  const { between } = record;
  if (between === null || !between.includes('/*')) return;
  const escapes = cssnanoUtils.endsWithEscapingBackslash(
    headText(tokenLists, record)
  );
  // After an open escape, the slash of `/*` is escaped, so nothing here is a comment.
  if (escapes && between.startsWith('/')) return;
  const cleaned = replaceComments(
    tokenize({ css: between }),
    comments.canRemove,
    ' ',
    false
  );
  const keepsNewline =
    cssnanoUtils.isCSSNewline(between.charCodeAt(0)) &&
    !cssnanoUtils.isCSSNewline(cleaned.charCodeAt(0)) &&
    escapes;
  writeBetween(records, index, keepsNewline ? '\n' + cleaned : cleaned);
}
