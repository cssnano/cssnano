import { resolveTargets } from '#utils/browser-targets';
import { discardDuplicates } from './lib/duplicates/discardDuplicates.js';
import {
  canonicalizeRecords,
  longhandContext,
} from './lib/longhand/canonicalize.js';
import { targetSupportOf } from './lib/longhand/targetSupport.js';
import runMerge from './lib/rules/selectorMerger.js';
import { fillSummaries } from '../ir/selectorList.js';
import { runDriver } from '../ir/runDriver.js';
import { createRunContext } from '../ir/runContext.js';
import { assertValid, isBoolean } from '../../optionGuards.js';
/** @import {BlockRecords} from '../ir/blockRecords.js' */
/** @import {Result, Root} from 'postcss' */
/** @import {RunContext} from '../ir/runContext.js' */
/** @import {LonghandRound} from './lib/longhand/canonicalize.js' */

/** The merge transforms take the records, the browser targets and the run context. */
/** @typedef {(records: BlockRecords, browsers: readonly string[], context: RunContext) => void} RecordTransform */

/**
 * Folds the selector summaries, which only rule merging reads, then runs the
 * transforms over the records in order.
 *
 * @param {BlockRecords} records
 * @param {readonly string[]} browsers
 * @param {RunContext} context
 * @param {readonly RecordTransform[]} transforms
 * @return {void}
 */
function runTransforms(records, browsers, context, transforms) {
  fillSummaries(records, context.tokenLists, browsers);
  for (const transform of transforms) transform(records, browsers, context);
}

/**
 * Runs the transforms over one stylesheet as one run of the driver.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers
 * @param {RunContext} context
 * @param {readonly RecordTransform[]} transforms
 * @param {Result} [result] the result whose messages the run pushes to
 * @return {void}
 */
function runOver(css, browsers, context, transforms, result) {
  const state = runDriver.build(css, context);
  runTransforms(state.records, browsers, context, transforms);
  runDriver.end(state, { browsers, folded: true, result });
}

/**
 * The merge transforms over the records, in the order the default preset runs
 * them: canonicalize every declaration block, remove duplicates, merge rules,
 * then canonicalize again every block still in the stylesheet.
 *
 * Canonicalizing is not idempotent: a block the first round reduced can reduce
 * again, so every block still in the stylesheet gets the second round.
 *
 * @param {BlockRecords} records the records of a built stylesheet
 * @param {readonly string[]} browsers the resolved browser targets
 * @param {RunContext} context the run's context
 * @param {{rules?: boolean, support?: ReturnType<typeof targetSupportOf>}} [options]
 *   whether rules are merged, and the targets' support when the caller has it
 * @return {void}
 */
export function mergeRecords(
  records,
  browsers,
  context,
  { rules = true, support = targetSupportOf(browsers) } = {}
) {
  const round = roundOf(support, context);
  fillSummaries(records, context.tokenLists, browsers);
  canonicalizeRecords(records, round);
  mergeOf(records, browsers, context, { rules });
  canonicalizeRecords(records, round);
}

export { targetSupportOf };

/**
 * The merge run of a preset, which the host runs between its walk and the walk
 * after merge. `support` gives the targets' support, whose features the host
 * gives the run's context. `round` makes the longhand round of the run, or
 * undefined when the runner has none. `merge` runs the dedupe and the rule
 * merge over the records, without the summaries. The host builds and ends the
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
  return longhandContext(
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
const MERGE_ONLY = Object.freeze([runMerge]);
/** The merge steps that a name of `transformRunner` runs, in the preset's order. @type {readonly (readonly ['discardDuplicates' | 'mergeRules', RecordTransform])[]} */
const NAMED_MERGE_STEPS = Object.freeze([
  ['discardDuplicates', discardDuplicates],
  ['mergeRules', runMerge],
]);

/**
 * The merge transforms over one stylesheet, as one run of the driver: build,
 * the merge transforms, then the end of the run.
 *
 * Longhand merging and duplicate removal always run. Rule merging runs unless
 * `rules` is false.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers the resolved browser targets
 * @param {{ rules?: boolean }} [options]
 * @param {Result} [result] the PostCSS result, whose messages the run pushes to
 * @param {boolean} [consistencyChecks] whether the run checks its caches; the process default otherwise
 * @return {void}
 */
export function mergePass(
  css,
  browsers,
  { rules = true } = {},
  result,
  consistencyChecks
) {
  const support = targetSupportOf(browsers);
  const context = createRunContext(consistencyChecks, support.features);
  const state = runDriver.build(css, context);
  mergeRecords(state.records, browsers, context, { rules, support });
  runDriver.end(state, { browsers, folded: true, result });
}

/** The guard for the `rules` option, shared with the preset that validates it. */
export const rulesGuard = Object.freeze({
  isValid: isBoolean,
  expected: 'a boolean',
});

/**
 * The `cssnano-merge` plugin: the merge transforms of the default preset, run
 * in one pass over the stylesheet. `rules: false` leaves rule merging out.
 *
 * @param {{ rules?: boolean }} [opts]
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  const { rules = true } = opts;
  // Preset options are validated before they reach the plugin; a direct user is not.
  assertValid(rulesGuard, rules, 'rules');
  return {
    postcssPlugin: 'cssnano-merge',
    /** @param {import('postcss').Result} result */
    prepare(result) {
      const browsers = resolveTargets(opts, result);
      return {
        /** @param {Root} css */
        OnceExit(css) {
          mergePass(css, browsers, { rules });
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;

export default pluginCreator;

/**
 * Each transform run alone, as the hook of its own plugin. They call the
 * library code directly, so a test can pin one transform without the preset.
 *
 * @type {Readonly<Record<'mergeLonghand' | 'discardDuplicates' | 'mergeRules' | 'dedupeThenMerge', (css: Root, browsers: readonly string[], consistencyChecks?: boolean) => void>>}
 */
const transformHooks = Object.freeze({
  mergeLonghand(css, browsers) {
    const support = targetSupportOf(browsers);
    const context = createRunContext(undefined, support.features);
    const longhand = longhandContext(
      support.placeShorthands,
      support.boxSupport,
      support.pairShorthands,
      context
    );
    runOver(css, browsers, context, [
      (records) => canonicalizeRecords(records, longhand),
    ]);
  },
  discardDuplicates(css, browsers, consistencyChecks) {
    runOver(css, [], createRunContext(consistencyChecks), DEDUPE_ONLY);
  },
  mergeRules(css, browsers, consistencyChecks) {
    runOver(css, browsers, createRunContext(consistencyChecks), MERGE_ONLY);
  },
  dedupeThenMerge(css, browsers, consistencyChecks) {
    runOver(
      css,
      browsers,
      createRunContext(consistencyChecks),
      DEDUPE_THEN_MERGE
    );
  },
});

/**
 * The pass of one merge transform, which a preset can run in the place of the
 * merge pass, so each transform can be tested alone.
 *
 * @param {'mergeLonghand' | 'discardDuplicates' | 'mergeRules' | 'dedupeThenMerge'} name
 * @return {(css: Root, browsers: readonly string[], consistencyChecks?: boolean) => void}
 */
export function transformPass(name) {
  return transformHooks[name];
}

/**
 * The creator of a pass that runs one transform, so each transform can be
 * tested alone as its own plugin.
 *
 * @param {'mergeLonghand' | 'discardDuplicates' | 'mergeRules' | 'dedupeThenMerge'} name
 * @param {boolean} [consistencyChecks] whether the run checks its caches; the process default otherwise
 * @return {import('postcss').PluginCreator<object>}
 */
export function transformPlugin(name, consistencyChecks) {
  const hook = transformHooks[name];
  /** @type {import('postcss').PluginCreator<object>} */
  const creator = (opts = {}) => ({
    postcssPlugin: 'cssnano-merge',
    /** @param {import('postcss').Result} result */
    prepare(result) {
      // Only discardDuplicates ignores the browser targets.
      const browsers =
        name === 'discardDuplicates' ? [] : resolveTargets(opts, result);
      return {
        /** @param {Root} css */
        OnceExit(css) {
          hook(css, browsers, consistencyChecks);
        },
      };
    },
  });
  creator.postcss = true;
  return creator;
}
