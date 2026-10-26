import type { CSSToken } from '@csstools/css-tokenizer';
import type { Helpers, Rule } from 'postcss';
import type { Reducer } from './host.js';
import type { TextTable } from '../values/textTable.js';
export type FoldedSelector = {
    text: string;
    tokens: readonly CSSToken[] | undefined;
};
export type SelectorEntry = {
    plan: readonly Reducer[] | null;
    memos: (Map<string, FoldedSelector> | undefined)[];
};
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Helpers, Rule} from 'postcss' */
/** @import {Reducer} from './host.js' */
/** @import {TextTable} from '../values/textTable.js' */
/**
 * A folded selector: its text, and the tokens that spell it when a stage read
 * them.
 * @typedef {{text: string, tokens: readonly CSSToken[] | undefined}} FoldedSelector
 */
/**
 * What one run knows about selectors: the buffer reducers of its plan, or null
 * when no stage rewrites them, with a memo per context.
 * @typedef {{plan: readonly Reducer[] | null, memos: (Map<string, FoldedSelector> | undefined)[]}} SelectorEntry
 */
/**
 * @param {readonly Reducer[]} plan in pipeline order, empty for no stage
 * @returns {SelectorEntry}
 */
export declare function selectorEntry(plan: readonly Reducer[]): SelectorEntry;
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
export declare function reduceSelector(entry: SelectorEntry, rule: Rule, read: string, text: string, context: number, helpers: Helpers, table: TextTable): void;
//# sourceMappingURL=selectorReduce.d.ts.map