import type { AtRule, Declaration, Helpers, Rule } from 'postcss';
import type { CSSToken } from '@csstools/css-tokenizer';
import type { FoldedText } from '../values/textTable.js';
import type { TokenizeMode } from '../values/valueBuffer.js';
import type { Reducer, TextReducer } from './host.js';
export type PlanStep = Reducer | {
    text: TextReducer;
};
export type PlanEntry = {
    /**
     * in pipeline order
     */
    plan: readonly PlanStep[] | null;
    memos: (Map<string, FoldedText> | undefined)[];
    mode: TokenizeMode | undefined;
    tightens: boolean;
    lists: Map<string, readonly CSSToken[]> | null;
};
/** @import {AtRule, Declaration, Helpers, Rule} from 'postcss' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {FoldedText} from '../values/textTable.js' */
/** @import {TokenizeMode} from '../values/valueBuffer.js' */
/** @import {Reducer, TextReducer} from './host.js' */
/**
 * One step of a plan: a buffer reducer, or a text reducer for an at-rule
 * prelude, which rewrites the text and starts a new buffer from its result.
 * @typedef {Reducer | {text: TextReducer}} PlanStep
 */
/**
 * What one run knows about a kind of text (a property value, a selector or an
 * at-rule prelude): the steps of its plan, or null when no stage rewrites it.
 * `memos` has a memo per context, since a text can read its context. `mode` is
 * how the tokenizer reads the text, and `lists` holds the token lists that
 * values share by text, or null when the kind does not share them.
 * `tightens` is set when a stage asks for the space after an at-rule name to be
 * stripped, as AtRulePart describes.
 * @typedef {object} PlanEntry
 * @property {readonly PlanStep[] | null} plan in pipeline order
 * @property {(Map<string, FoldedText> | undefined)[]} memos
 * @property {TokenizeMode | undefined} mode
 * @property {boolean} tightens
 * @property {Map<string, readonly CSSToken[]> | null} lists
 */
/**
 * @param {readonly PlanStep[]} plan in pipeline order, empty for no stage
 * @param {TokenizeMode | undefined} mode
 * @param {Map<string, readonly CSSToken[]> | null} lists
 * @param {boolean} tightens
 * @returns {PlanEntry}
 */
export declare function planEntry(plan: readonly PlanStep[], mode: TokenizeMode | undefined, lists: Map<string, readonly CSSToken[]> | null, tightens: boolean): PlanEntry;
/**
 * Folds a text through its plan on one lazy buffer, and reports the warnings of
 * the fold on the node. A text step that changes the text starts a new buffer
 * from its result, and the final buffer's text and tokens are the fold. A
 * memo hit is served from the memo, and a fold that warned is not memoised, so
 * each node reports it.
 *
 * @param {PlanEntry} entry
 * @param {string} text
 * @param {number} context
 * @param {Rule | Declaration | AtRule} node the node that holds the text
 * @param {Helpers} helpers
 * @returns {FoldedText}
 */
export declare function foldPlan(entry: PlanEntry, text: string, context: number, node: Rule | Declaration | AtRule, helpers: Helpers): FoldedText;
//# sourceMappingURL=plan.d.ts.map