import type { AtRule, Declaration, Helpers, Rule } from 'postcss';
import type { TextTable } from '../values/textTable.js';
import type { FoldedText } from '../values/textTable.js';
import type { TokenizeMode } from '../values/valueBuffer.js';
import type { Reducer } from './host.js';
import type { RunContext } from '../passes/ir/runContext.js';
import type { ArenaIndex } from '../passes/ir/blockRecord.js';
import type { TokenListId } from '../passes/ir/tokenLists.js';
export type PlanEntry = {
    /**
     * in pipeline order
     */
    plan: readonly Reducer[] | null;
    memos: (Map<string, FoldedText> | undefined)[];
    folds: (Map<TokenListId, TokenListId> | undefined)[];
    mode: TokenizeMode | undefined;
    tightens: boolean;
};
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
export declare function planEntry(plan: readonly Reducer[], mode: TokenizeMode | undefined, tightens: boolean): PlanEntry;
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
export declare function foldPlan(entry: PlanEntry, text: string, context: number, node: Rule | Declaration | AtRule, helpers: Helpers): FoldedText;
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
export declare function foldList(entry: PlanEntry, source: TokenListId, context: number, run: RunContext, index: ArenaIndex): TokenListId;
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
export declare function foldNode(entry: PlanEntry, node: Rule | Declaration | AtRule, read: string, text: string, context: number, helpers: Helpers, table: TextTable): FoldedText;
/**
 * Looks up the memo of a context, creating it on first use.
 *
 * @template T
 * @param {(Map<string, T> | undefined)[]} memos
 * @param {number} context
 * @returns {Map<string, T>}
 */
export declare function memoOf<T>(memos: (Map<string, T> | undefined)[], context: number): Map<string, T>;
//# sourceMappingURL=plan.d.ts.map