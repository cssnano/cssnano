import type { Helpers, Rule } from 'postcss';
import type { Reducer } from './host.js';
import type { PlanEntry } from './plan.js';
import type { TextTable } from '../values/textTable.js';
/** @import {Helpers, Rule} from 'postcss' */
/** @import {Reducer} from './host.js' */
/** @import {PlanEntry} from './plan.js' */
/** @import {TextTable} from '../values/textTable.js' */
/**
 * @param {readonly Reducer[]} plan in pipeline order, empty for no stage
 * @returns {PlanEntry}
 */
export declare function selectorEntry(plan: readonly Reducer[]): PlanEntry;
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
export declare function reduceSelector(entry: PlanEntry, rule: Rule, read: string, text: string, context: number, helpers: Helpers, table: TextTable): void;
//# sourceMappingURL=selectorReduce.d.ts.map