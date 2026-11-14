import { tokenize } from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import { writeAfterName, writePreludeList } from '../passes/ir/rawEdits.js';
import { sourceListOf } from '../passes/ir/writtenList.js';
import { startsWithBalancedParen, tightenAfterName } from './afterName.js';
import { foldList } from './plan.js';
import { atRuleEntry } from './prelude.js';
import { removeBetween } from './comments/removeBetween.js';
import { replaceComments } from './comments/replaceComments.js';

/** @import {ArenaIndex, BlockRecord, NodeEntry} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {RunContext} from '../passes/ir/runContext.js' */
/** @import {TokenListId} from '../passes/ir/tokenLists.js' */
/** @import {CommentState} from './comments/commentState.js' */
/** @import {DeclarationPlans} from './declarationWalk.js' */

/**
 * Removes the comments between an at-rule's name and its prelude. A name that
 * loses every comment keeps one space on each side.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {CommentState} comments
 */
function removeAfterNameComments(records, index, comments) {
  const { afterName } = /** @type {BlockRecord | NodeEntry} */ (
    records.entry(index)
  );
  if (afterName === null || !afterName.includes('/*')) return;
  const replaced = replaceComments(
    tokenize({ css: afterName }),
    comments.canRemove
  );
  writeAfterName(records, index, replaced === '' ? ' ' : ` ${replaced} `);
}

/**
 * The id of a prelude without its comments that go. The cleaned text is
 * interned in the run, with no tokenize mode, as at-rule preludes are.
 *
 * @param {RunContext} run
 * @param {TokenListId} source the id of the prelude as written
 * @param {CommentState} comments
 * @returns {TokenListId}
 */
function commentFreeIdOf(run, source, comments) {
  const cleaned = replaceComments(
    run.tokenLists.get(source),
    comments.canRemove,
    ' ',
    false
  );
  return run.valueIds.idOf(run.tokenLists, undefined, cleaned);
}

/**
 * Runs the at-rule part of the walk over one at-rule record, before its
 * children: its comments in the gap before the block and after the name, then
 * its prelude's fold through the plan of its name, and the space after the name
 * once the plan asks for it. The prelude is written only when its id changes.
 * `@charset` has no plan, since its name and encoding are read in the format
 * phase. A prelude that the build gives as empty is not folded.
 *
 * @param {DeclarationPlans} plans
 * @param {BlockRecords} records
 * @param {RunContext} run
 * @param {number} context the context of the at-rule, with the bits of its own name
 * @param {ArenaIndex} index the at-rule's index, a block or a statement
 * @returns {TokenListId} the id of the prelude after the walk
 */
export function visitAtRule(plans, records, run, context, index) {
  const record = /** @type {BlockRecord | NodeEntry} */ (records.entry(index));
  const { comments } = plans;
  if (comments !== null) {
    removeBetween(records, index, comments);
    removeAfterNameComments(records, index, comments);
  }
  const source = /** @type {TokenListId} */ (sourceListOf(record));
  let id = source;
  if (comments !== null && run.tokenLists.holdsCommentStart(source)) {
    id = commentFreeIdOf(run, source, comments);
  }
  let entry;
  if (cssnanoUtils.asciiLowerCase(record.name) !== 'charset') {
    entry = plans.atRules.get(record.name);
    if (entry === undefined) {
      entry = atRuleEntry(plans.stages, record.name);
      plans.atRules.set(record.name, entry);
    }
  }
  const hasPrelude =
    run.tokenLists.textLength(/** @type {TokenListId} */ (record.preludeId)) >
    0;
  let result = id;
  if (entry !== undefined && entry.plan !== null && hasPrelude) {
    result = foldList(entry, id, context, run, index);
  }
  if (result !== source) writePreludeList(run, record, result);
  if (entry !== undefined && entry.tightens && hasPrelude) {
    const balanced = startsWithBalancedParen(run.tokenLists.get(result));
    tightenAfterName(
      records,
      index,
      run.tokenLists.textLength(result) === 0,
      balanced
    );
  }
  return result;
}
