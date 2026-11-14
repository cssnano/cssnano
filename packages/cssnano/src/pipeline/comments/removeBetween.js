import { tokenize } from '@csstools/css-tokenizer';
import { writeBetween } from '../../passes/ir/rawEdits.js';
import { replaceComments } from './replaceComments.js';

/** @import {ArenaIndex, BlockRecord, NodeEntry} from '../../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../passes/ir/blockRecords.js' */
/** @import {RuleRecord} from '../../passes/ir/ruleRecord.js' */
/** @import {CommentState} from './commentState.js' */

/**
 * Removes the comments in the gap between a rule's or at-rule's prelude and
 * its block.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {CommentState} comments
 */
export function removeBetween(records, index, comments) {
  const { between } = /** @type {BlockRecord | NodeEntry | RuleRecord} */ (
    records.entry(index)
  );
  if (between === null || !between.includes('/*')) return;
  writeBetween(
    records,
    index,
    replaceComments(tokenize({ css: between }), comments.canRemove, ' ', false)
  );
}
