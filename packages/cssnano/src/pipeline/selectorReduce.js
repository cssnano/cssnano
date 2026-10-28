import { foldPlan, planEntry } from './plan.js';

/** @import {Helpers, Rule} from 'postcss' */
/** @import {Reducer} from './host.js' */
/** @import {PlanEntry} from './plan.js' */
/** @import {TextTable} from '../values/textTable.js' */

/**
 * @param {readonly Reducer[]} plan in pipeline order, empty for no stage
 * @returns {PlanEntry}
 */
export function selectorEntry(plan) {
  return planEntry(plan, undefined, null, false);
}

/**
 * Folds the text of a selector through its plan and gives the rule the result.
 * The table keeps the tokens a stage read for later readers. A selector that
 * is unchanged and was not tokenized is not assigned, as the rule spells it.
 *
 * @param {PlanEntry} entry
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
  const folded = foldPlan(entry, text, context, rule, helpers);
  if (folded.text !== read || folded.tokens !== undefined) {
    table.assignFolded(rule, folded);
  }
}
