import { discardDuplicates } from './duplicates/discardDuplicates.js';
import { LonghandRound } from './longhand/canonicalize.js';
import { targetSupportOf } from './longhand/targetSupport.js';
import runMerge from './rules/selectorMerger.js';
import { isBoolean } from '../optionGuards.js';
/** @import {BlockRecords} from '../ir/blockRecords.js' */
/** @import {Result, Root} from 'postcss' */
/** @import {RunContext} from '../run/runContext.js' */

/** The merge transforms take the records, the browser targets and the run context. */
/** @typedef {(records: BlockRecords, browsers: readonly string[], context: RunContext) => void} RecordTransform */

/**
 * The merge run of a preset. `support` gives the targets' support, whose
 * features the host gives the run's context. `round` makes the longhand round
 * of the run, or undefined when the runner has none: the walk down runs it, and
 * the walk up runs its second round. `merge` runs the dedupe and the rule merge
 * over the records between the walks, without the summaries. The host builds and ends the
 * run, so it imports nothing of the merge.
 *
 * @typedef {{
 *   support: (browsers: readonly string[]) => ReturnType<typeof targetSupportOf>,
 *   round: (support: ReturnType<typeof targetSupportOf>, context: RunContext) => LonghandRound | undefined,
 *   merge: (records: BlockRecords, browsers: readonly string[], context: RunContext, options: {rules?: boolean}) => void,
 * }} MergeRunner
 */

/**
 * The longhand round of a run, with the targets' support.
 *
 * @param {ReturnType<typeof targetSupportOf>} support
 * @param {RunContext} context
 * @return {LonghandRound}
 */
function roundOf(support, context) {
  return new LonghandRound(
    support.placeShorthands,
    support.boxSupport,
    support.pairShorthands,
    context
  );
}

/**
 * The dedupe, and the rule merge unless `rules` is false, over the records,
 * without the summaries that the rule merge reads.
 *
 * @param {BlockRecords} records
 * @param {readonly string[]} browsers
 * @param {RunContext} context
 * @param {{rules?: boolean}} options
 * @return {void}
 */
function mergeOf(records, browsers, context, { rules = true }) {
  for (const transform of rules ? DEDUPE_THEN_MERGE : DEDUPE_ONLY) {
    transform(records, browsers, context);
  }
}

/** @type {MergeRunner} */
export const mergeRunner = Object.freeze({
  support: targetSupportOf,
  round: roundOf,
  merge: mergeOf,
});

/**
 * A merge run of the named transforms alone, for a test that pins some of
 * the merge transforms without the preset's order. The names choose which of
 * the three transforms run; the merge runs them in the preset's order.
 * Longhand canonicalizing takes the support of its run.
 *
 * @param {...('mergeLonghand' | 'discardDuplicates' | 'mergeRules')} names
 * @return {MergeRunner}
 */
export function transformRunner(...names) {
  return Object.freeze({
    support: targetSupportOf,
    round: (support, context) =>
      names.includes('mergeLonghand') ? roundOf(support, context) : undefined,
    merge: (records, browsers, context) => {
      for (const [name, transform] of NAMED_MERGE_STEPS) {
        if (names.includes(name)) transform(records, browsers, context);
      }
    },
  });
}

/** The transforms that run over the records, in order, for each path of the pass. */
const DEDUPE_THEN_MERGE = Object.freeze([discardDuplicates, runMerge]);
const DEDUPE_ONLY = Object.freeze([discardDuplicates]);
/** The merge steps that a name of `transformRunner` runs, in the preset's order. @type {readonly (readonly ['discardDuplicates' | 'mergeRules', RecordTransform])[]} */
const NAMED_MERGE_STEPS = Object.freeze([
  ['discardDuplicates', discardDuplicates],
  ['mergeRules', runMerge],
]);

/** The guard for the `rules` option, shared with the preset that validates it. */
export const rulesGuard = Object.freeze({
  isValid: isBoolean,
  expected: 'a boolean',
});
