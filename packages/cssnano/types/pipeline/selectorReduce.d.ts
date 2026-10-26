import type { Helpers, Rule } from 'postcss';
import type { Reducer } from './host.js';
export type SelectorEntry = {
    plan: readonly Reducer[] | null;
    memos: (Map<string, string> | undefined)[];
};
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
export declare function selectorEntry(plan: readonly Reducer[]): SelectorEntry;
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
export declare function reduceSelector(entry: SelectorEntry, text: string, context: number, rule: Rule, helpers: Helpers): string;
//# sourceMappingURL=selectorReduce.d.ts.map