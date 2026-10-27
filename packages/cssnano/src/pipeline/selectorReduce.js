import { ValueBuffer } from '../values/valueBuffer.js';
import { memoOf } from './memo.js';

/** @import {Helpers, Rule} from 'postcss' */
/** @import {Reducer} from './host.js' */
/** @import {FoldedText, TextTable} from '../values/textTable.js' */

/**
 * What one run knows about selectors: the buffer reducers of its plan, or null
 * when no stage rewrites them, with a memo per context.
 * @typedef {{plan: readonly Reducer[] | null, memos: (Map<string, FoldedText> | undefined)[]}} SelectorEntry
 */

/**
 * @param {readonly Reducer[]} plan in pipeline order, empty for no stage
 * @returns {SelectorEntry}
 */
export function selectorEntry(plan) {
  return { plan: plan.length > 0 ? plan : null, memos: [] };
}

/**
 * Folds the text of a selector through its plan and gives the rule the result.
 * The stages share one buffer, so a selector is tokenized only when a stage
 * reads its tokens, and the table keeps those tokens for later readers. A text
 * that warned is not memoised, and its warnings name the rule.
 *
 * @param {SelectorEntry} entry
 * @param {Rule} rule
 * @param {string} read the selector as written
 * @param {string} text the selector without the comments the run removes
 * @param {number} context
 * @param {Helpers} helpers
 * @param {TextTable} table
 */
export function reduceSelector(
  entry,
  rule,
  read,
  text,
  context,
  helpers,
  table
) {
  const memo = memoOf(entry.memos, context);
  const known = memo.get(text);
  if (known !== undefined) {
    table.assignFolded(rule, known);
    return;
  }
  const plan = /** @type {readonly Reducer[]} */ (entry.plan);
  const buffer = new ValueBuffer(text);
  for (const reduce of plan) reduce(buffer, context);
  const result = buffer.text();
  const tokens = buffer.isTokenized() ? buffer.tokens() : undefined;
  const folded = /** @type {FoldedText} */ ({ text: result, tokens });
  const warnings = buffer.warnings();
  if (warnings === undefined) {
    memo.set(text, folded);
  } else {
    for (const { message, plugin } of warnings) {
      helpers.result.warn(
        message,
        plugin ? { plugin, node: rule } : { node: rule }
      );
    }
  }
  if (result !== read || tokens !== undefined) table.assignFolded(rule, folded);
}
