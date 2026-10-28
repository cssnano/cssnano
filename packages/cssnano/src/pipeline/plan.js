import { ValueBuffer } from '../values/valueBuffer.js';

/** @import {AtRule, Declaration, Helpers, Rule} from 'postcss' */
/** @import {TextTable} from '../values/textTable.js' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {FoldedText} from '../values/textTable.js' */
/** @import {TokenizeMode} from '../values/valueBuffer.js' */
/** @import {Reducer} from './host.js' */

/**
 * What one run knows about a kind of text (a property value, a selector or an
 * at-rule prelude): the steps of its plan, or null when no stage rewrites it.
 * `memos` has a memo per context, since a text can read its context. `mode` is
 * how the tokenizer reads the text, and `lists` holds the token lists that
 * values share by text, or null when the kind does not share them.
 * `tightens` is set when a stage asks for the space after an at-rule name to be
 * stripped, as AtRulePart describes.
 * @typedef {object} PlanEntry
 * @property {readonly Reducer[] | null} plan in pipeline order
 * @property {(Map<string, FoldedText> | undefined)[]} memos
 * @property {TokenizeMode | undefined} mode
 * @property {boolean} tightens
 * @property {Map<string, readonly CSSToken[]> | null} lists
 */

/**
 * @param {readonly Reducer[]} plan in pipeline order, empty for no stage
 * @param {TokenizeMode | undefined} mode
 * @param {Map<string, readonly CSSToken[]> | null} lists
 * @param {boolean} tightens
 * @returns {PlanEntry}
 */
export function planEntry(plan, mode, lists, tightens) {
  return {
    plan: plan.length > 0 ? plan : null,
    memos: [],
    mode,
    tightens,
    lists,
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
  const lists = entry.lists;
  const buffer = new ValueBuffer(text, entry.mode, lists?.get(text));
  for (const step of plan) step(buffer, context);
  const warnings = buffer.warnings();
  const result = buffer.text();
  let tokens;
  if (buffer.isTokenized()) {
    tokens = lists?.get(result);
    if (tokens === undefined) {
      tokens = buffer.tokens();
      lists?.set(result, tokens);
    }
  }
  const folded = { text: result, tokens };
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
 * Folds the text of a node through its plan and gives the node the result when
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
 * @returns {string} the folded text
 */
export function foldNode(entry, node, read, text, context, helpers, table) {
  const folded = foldPlan(entry, text, context, node, helpers);
  if (folded.text !== read || folded.tokens !== undefined) {
    table.assignFolded(node, folded);
  }
  return folded.text;
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
