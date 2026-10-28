import { ValueBuffer } from '../values/valueBuffer.js';
import { memoOf } from './memo.js';

/** @import {AtRule, Helpers} from 'postcss' */
/** @import {FoldedText} from '../values/textTable.js' */
/** @import {Reducer, Stage, TextReducer} from './host.js' */

/**
 * One step of a prelude's plan: a text reducer, or a reducer that edits the
 * prelude's buffer.
 * @typedef {{text: TextReducer} | {buffer: Reducer}} PreludeStep
 */

/**
 * What one run knows about a prelude or selector kind: the steps of its plan,
 * or null when no stage rewrites it, with a memo per context as above.
 * `tightens` is set when a stage asks for the space after an at-rule name to be
 * stripped, as AtRulePart describes.
 * @typedef {{plan: readonly PreludeStep[] | null, memos: (Map<string, FoldedText> | undefined)[], tightens: boolean}} TextEntry
 */

/**
 * @param {readonly PreludeStep[]} plan in pipeline order, empty for no stage
 * @param {boolean} tightens whether a stage tightens the space after the name
 * @returns {TextEntry}
 */
function textEntry(plan, tightens) {
  return { plan: plan.length > 0 ? plan : null, memos: [], tightens };
}

/**
 * Folds the prelude through its plan on a value buffer. A text step that
 * changes the text starts a new buffer from its result, and the final buffer's
 * text and tokens are the fold. A fold that warned is not memoised, and its
 * warnings name the node.
 *
 * @param {TextEntry} entry
 * @param {string} text
 * @param {number} context
 * @param {AtRule} atRule the at-rule that holds the prelude
 * @param {Helpers} helpers
 * @returns {FoldedText}
 */
function foldPrelude(entry, text, context, atRule, helpers) {
  const plan = /** @type {readonly PreludeStep[]} */ (entry.plan);
  const memo = memoOf(entry.memos, context);
  const known = memo.get(text);
  if (known !== undefined) return known;
  let buffer = new ValueBuffer(text);
  /** @type {{message: string, plugin: string | undefined}[]} */
  const warnings = [];
  for (const step of plan) {
    if ('buffer' in step) {
      step.buffer(buffer, context);
      continue;
    }
    const before = buffer.text();
    const result = step.text(before, context, (message, plugin) => {
      buffer.warn(message, plugin);
    });
    if (result === before) continue;
    warnings.push(...(buffer.warnings() ?? []));
    buffer = new ValueBuffer(result);
  }
  warnings.push(...(buffer.warnings() ?? []));
  const folded = {
    text: buffer.text(),
    tokens: buffer.isTokenized() ? buffer.tokens() : undefined,
  };
  if (warnings.length === 0) memo.set(text, folded);
  for (const { message, plugin } of warnings) {
    helpers.result.warn(
      message,
      plugin ? { plugin, node: atRule } : { node: atRule }
    );
  }
  return folded;
}

/**
 * The plan of an at-rule name: the prelude reducers of the stages that rewrite
 * it, and whether one of them tightens the space after the name.
 *
 * @param {readonly Stage[]} stages in pipeline order
 * @param {string} name
 * @returns {TextEntry}
 */
function atRuleEntry(stages, name) {
  /** @type {PreludeStep[]} */
  const plan = [];
  let tightens = false;
  for (const stage of stages) {
    const part = stage.forAtRule?.(name) ?? null;
    if (part === null) continue;
    if (typeof part === 'function') {
      plan.push({ text: part });
    } else {
      plan.push(
        'buffer' in part ? { buffer: part.buffer } : { text: part.reduce }
      );
      tightens ||= part.tightensAfterName === true;
    }
  }
  return textEntry(plan, tightens);
}

export { atRuleEntry, foldPrelude };
