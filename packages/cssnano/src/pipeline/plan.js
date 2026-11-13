import { ValueBuffer } from '../values/valueBuffer.js';

/** @import {AtRule, Declaration, Helpers, Rule} from 'postcss' */
/** @import {TextTable} from '../values/textTable.js' */
/** @import {FoldedText} from '../values/textTable.js' */
/** @import {TokenizeMode} from '../values/valueBuffer.js' */
/** @import {Reducer} from './host.js' */
/** @import {RunContext} from '../passes/ir/runContext.js' */
/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {TokenListId} from '../passes/ir/tokenLists.js' */
import { startsWithBalancedParen } from './afterName.js';

/**
 * What one run knows about a kind of text (a property value, a selector or an
 * at-rule prelude): the steps of its plan, or null when no stage rewrites it.
 * `memos` has a text memo per context, for the kinds the node walk folds, and
 * `folds` a table per context from the id of a comment-free source list to the
 * id of its result, for the declarations of the record walk. `mode` is how the
 * tokenizer reads the text. `tightens` is set when a stage asks for the space
 * after an at-rule name to be stripped, as AtRulePart describes.
 * @typedef {object} PlanEntry
 * @property {readonly Reducer[] | null} plan in pipeline order
 * @property {(Map<string, FoldedText> | undefined)[]} memos
 * @property {(Map<TokenListId, TokenListId> | undefined)[]} folds
 * @property {TokenizeMode | undefined} mode
 * @property {boolean} tightens
 */

/**
 * @param {readonly Reducer[]} plan in pipeline order, empty for no stage
 * @param {TokenizeMode | undefined} mode
 * @param {boolean} tightens
 * @returns {PlanEntry}
 */
export function planEntry(plan, mode, tightens) {
  return {
    plan: plan.length > 0 ? plan : null,
    memos: [],
    folds: [],
    mode,
    tightens,
  };
}

/**
 * Folds a text through its plan on one lazy buffer, and reports the warnings of
 * the fold on the node. The buffer's text and tokens are the fold. A memo hit
 * is served from the memo, and a fold that warned is not memoised, so each
 * node reports it.
 *
 * @param {PlanEntry} entry
 * @param {string} text
 * @param {number} context
 * @param {Rule | Declaration | AtRule} node the node that holds the text
 * @param {Helpers} helpers
 * @returns {FoldedText}
 */
export function foldPlan(entry, text, context, node, helpers) {
  const plan = /** @type {readonly Reducer[]} */ (entry.plan);
  const memo = memoOf(entry.memos, context);
  const known = memo.get(text);
  if (known !== undefined) return known;
  const buffer = new ValueBuffer(text, entry.mode);
  for (const step of plan) step(buffer, context);
  const warnings = buffer.warnings();
  const result = buffer.text();
  const tokens = buffer.isTokenized() ? buffer.tokens() : undefined;
  const folded = entry.tightens
    ? {
        text: result,
        tokens,
        tightAfterName: startsWithBalancedParen(result, tokens),
      }
    : { text: result, tokens };
  if (warnings === undefined) {
    memo.set(text, folded);
  } else {
    for (const { message, plugin } of warnings) {
      helpers.result.warn(message, plugin ? { plugin, node } : { node });
    }
  }
  return folded;
}

/**
 * Folds the value of a declaration through its plan, from the id of its
 * comment-free source list, and returns the id of the result. A value no step
 * edited is its own result. The table of the entry, per context, serves a
 * source it has folded already, and a fold that warned is not stored, so each
 * declaration reports it. A warning is a message of the run that names the
 * declaration.
 *
 * @param {PlanEntry} entry
 * @param {TokenListId} source the id of the comment-free value, interned in the entry's mode
 * @param {number} context
 * @param {RunContext} run
 * @param {ArenaIndex} index the declaration's index
 * @returns {TokenListId} the id of the folded value
 */
export function foldList(entry, source, context, run, index) {
  const folds = foldsOf(entry.folds, context);
  const known = folds.get(source);
  if (known !== undefined) return known;
  const shared = run.tokenLists.get(source);
  const buffer = new ValueBuffer(undefined, entry.mode, shared);
  for (const step of /** @type {readonly Reducer[]} */ (entry.plan)) {
    step(buffer, context);
  }
  const warnings = buffer.warnings();
  if (warnings !== undefined) {
    for (const { message, plugin } of warnings) {
      run.messages.push({ index, type: 'warning', plugin, text: message });
    }
  }
  const result = buffer.isEdited()
    ? run.valueIds.idOf(
        run.tokenLists,
        entry.mode,
        buffer.text(),
        buffer.tokens()
      )
    : source;
  if (warnings === undefined) folds.set(source, result);
  return result;
}

/**
 * Folds a text of a node through its plan and gives the node the result when
 * a stage changed the text or read its tokens. An unchanged text that was not
 * tokenized is left as written, so the node is not assigned.
 *
 * @param {PlanEntry} entry
 * @param {Rule | Declaration | AtRule} node
 * @param {string} read the text as written
 * @param {string} text the text without the comments the run removes
 * @param {number} context
 * @param {Helpers} helpers
 * @param {TextTable} table
 * @returns {FoldedText} the folded text
 */
export function foldNode(entry, node, read, text, context, helpers, table) {
  const folded = foldPlan(entry, text, context, node, helpers);
  if (entry.mode !== undefined) {
    // A list in a tokenize mode is read only in that mode, so keep the text.
    if (folded.text !== read) table.setText(node, folded.text);
  } else if (folded.text !== read || folded.tokens !== undefined) {
    table.assignFolded(node, folded);
  }
  return folded;
}

/**
 * Looks up the memo of a context, creating it on first use.
 *
 * @template T
 * @param {(Map<string, T> | undefined)[]} memos
 * @param {number} context
 * @returns {Map<string, T>}
 */
export function memoOf(memos, context) {
  let memo = memos[context];
  if (memo === undefined) {
    memo = new Map();
    memos[context] = memo;
  }
  return memo;
}

/**
 * Looks up the fold table of a context, creating it on first use.
 *
 * @param {(Map<TokenListId, TokenListId> | undefined)[]} folds
 * @param {number} context
 * @returns {Map<TokenListId, TokenListId>}
 */
function foldsOf(folds, context) {
  let table = folds[context];
  if (table === undefined) {
    table = new Map();
    folds[context] = table;
  }
  return table;
}
