import { ValueBuffer } from '../values/valueBuffer.js';

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
export function planEntry(plan, mode, tightens) {
  return {
    plan: plan.length > 0 ? plan : null,
    folds: [],
    mode,
    tightens,
  };
}

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
export function foldList(entry, source, context, run, index) {
  const folds = foldsOf(entry.folds, context);
  const known = folds.get(source);
  if (known !== undefined) return known;
  const shared = run.tokenLists.get(source);
  const buffer = new ValueBuffer(undefined, entry.mode, shared);
  for (const step of /** @type {readonly Reducer[]} */ (entry.plan)) {
    step(buffer, context);
  }
  const warnings = buffer.warnings();
  if (warnings !== undefined) {
    for (const { message, plugin } of warnings) {
      run.messages.push({ index, type: 'warning', plugin, text: message });
    }
  }
  const result = buffer.isEdited()
    ? run.valueIds.idOf(
        run.tokenLists,
        entry.mode,
        buffer.text(),
        buffer.tokens()
      )
    : source;
  if (warnings === undefined) folds.set(source, result);
  return result;
}

/**
 * Looks up the fold table of a context, creating it on first use.
 *
 * @param {(Map<TokenListId, TokenListId> | undefined)[]} folds
 * @param {number} context
 * @returns {Map<TokenListId, TokenListId>}
 */
function foldsOf(folds, context) {
  let table = folds[context];
  if (table === undefined) {
    table = new Map();
    folds[context] = table;
  }
  return table;
}
