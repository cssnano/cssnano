import { ValueBuffer } from '../values/valueBuffer.js';
import { memoOf } from './memo.js';

/** @import {Helpers, Rule} from 'postcss' */
/** @import {Reducer} from './host.js' */

/**
 * What one run knows about selectors: the buffer reducers of its plan, or null
 * when no stage rewrites them, with a memo per context.
 * @typedef {{plan: readonly Reducer[] | null, memos: (Map<string, string> | undefined)[]}} SelectorEntry
 */

/**
 * @param {readonly Reducer[]} plan in pipeline order, empty for no stage
 * @returns {SelectorEntry}
 */
export function selectorEntry(plan) {
  return { plan: plan.length > 0 ? plan : null, memos: [] };
}

/**
 * Folds the text of a selector through its plan. The stages share one buffer,
 * so a selector is tokenized only when a stage reads its tokens. A text that
 * warned is not memoised, and its warnings name the rule.
 *
 * @param {SelectorEntry} entry
 * @param {string} text
 * @param {number} context
 * @param {Rule} rule
 * @param {Helpers} helpers
 * @returns {string}
 */
export function reduceSelector(entry, text, context, rule, helpers) {
  const plan = /** @type {readonly Reducer[]} */ (entry.plan);
  const memo = memoOf(entry.memos, context);
  const known = memo.get(text);
  if (known !== undefined) return known;
  const buffer = new ValueBuffer(text);
  for (const reduce of plan) reduce(buffer, context);
  const result = buffer.text();
  const warnings = buffer.warnings();
  if (warnings === undefined) {
    memo.set(text, result);
  } else {
    for (const { message, plugin } of warnings) {
      helpers.result.warn(
        message,
        plugin ? { plugin, node: rule } : { node: rule }
      );
    }
  }
  return result;
}
