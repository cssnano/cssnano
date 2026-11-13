import { tokenize } from '@csstools/css-tokenizer';
import { writeBetween } from '../passes/ir/rawEdits.js';
import { writeSelectorList } from '../passes/ir/selectorEdits.js';
import { sourceListOf } from '../passes/ir/writtenList.js';
import {
  replaceComments,
  replaceCommentsInSelector,
} from './comments/replaceComments.js';
import { foldList } from './plan.js';

/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {RunContext} from '../passes/ir/runContext.js' */
/** @import {RuleRecord} from '../passes/ir/ruleRecord.js' */
/** @import {TokenListId} from '../passes/ir/tokenLists.js' */
/** @import {CommentState} from './comments/commentState.js' */
/** @import {DeclarationPlans} from './declarationWalk.js' */

/**
 * Removes the comments in the gap between a rule's selector and its block.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {CommentState} comments
 */
function removeRuleBetween(records, index, comments) {
  const { between } = /** @type {RuleRecord} */ (records.entry(index));
  if (between === null || !between.includes('/*')) return;
  writeBetween(
    records,
    index,
    replaceComments(tokenize({ css: between }), comments.canRemove, ' ', false)
  );
}

/**
 * The id of a selector without its comments. A selector without a comment
 * start keeps its id. Otherwise the cleaned text is interned in the run, as a
 * selector is in the default mode.
 *
 * @param {RunContext} run
 * @param {TokenListId} source the id of the selector as written
 * @param {CommentState} comments
 * @returns {TokenListId}
 */
function commentFreeSelectorIdOf(run, source, comments) {
  if (!run.tokenLists.holdsCommentStart(source)) return source;
  const cleaned = replaceCommentsInSelector(
    run.tokenLists.get(source),
    comments.canRemove
  );
  return run.valueIds.idOf(run.tokenLists, undefined, cleaned);
}

/**
 * Runs the rule part of the walk over one rule record, before its children: its
 * comments between the selector and the block, then its selector's fold. The
 * selector is written only when its id changes, so a rule no stage or comment
 * removal changed keeps its written list.
 *
 * @param {DeclarationPlans} plans
 * @param {BlockRecords} records
 * @param {RunContext} run
 * @param {number} context the context of the rule, with the bits of its own selector's fold
 * @param {ArenaIndex} index the rule's index
 */
export function visitRule(plans, records, run, context, index) {
  const { comments, selectors } = plans;
  if (comments !== null) removeRuleBetween(records, index, comments);
  if (comments === null && selectors.plan === null) return;
  const source = /** @type {TokenListId} */ (
    sourceListOf(records.entry(index))
  );
  let id = source;
  if (comments !== null) id = commentFreeSelectorIdOf(run, source, comments);
  const result =
    selectors.plan === null ? id : foldList(selectors, id, context, run, index);
  if (result !== source) {
    writeSelectorList(
      /** @type {RuleRecord} */ (records.entry(index)),
      run,
      result
    );
  }
}
