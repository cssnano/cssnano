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
    folds: (Map<TokenListId, TokenListId> | undefined)[];
    mode: TokenizeMode | undefined;
    tightens: boolean;
};
/** @import {TokenizeMode} from '../values/valueBuffer.js' */
/** @import {Reducer} from './host.js' */
/** @import {RunContext} from '../passes/ir/runContext.js' */
/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {TokenListId} from '../passes/ir/tokenLists.js' */
/**
 * What one run knows about a kind of text (a property value, a selector or an
 * at-rule prelude): the steps of its plan, or null when no stage rewrites it.
 * `folds` has a table per context from the id of a comment-free source list to
 * the id of its result. `mode` is how the tokenizer reads the text. `tightens`
 * is set when a stage asks for the space after an at-rule name to be stripped,
 * as AtRulePart describes.
 * @typedef {object} PlanEntry
 * @property {readonly Reducer[] | null} plan in pipeline order
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
 * Folds a text of one entry (a value, a selector or a prelude) through its
 * plan, from the id of its comment-free source list, and returns the id of the
 * result. A text no step edited is its own result. The table of the entry, per
 * context, serves a source it has folded already, and a fold that warned is not
 * stored, so each entry reports it. A warning is a message of the run that
 * names the entry.
 *
 * @param {PlanEntry} entry
 * @param {TokenListId} source the id of the comment-free text, interned in the entry's mode
 * @param {number} context
 * @param {RunContext} run
 * @param {ArenaIndex} index the index of the declaration, rule or at-rule
 * @returns {TokenListId} the id of the folded text
 */
export declare function foldList(entry: PlanEntry, source: TokenListId, context: number, run: RunContext, index: ArenaIndex): TokenListId;
//# sourceMappingURL=plan.d.ts.map