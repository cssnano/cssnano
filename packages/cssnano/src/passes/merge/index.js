import { resolveTargets } from '#utils/browser-targets';
import { discardDuplicates } from './lib/duplicates/discardDuplicates.js';
import {
  canonicalizeRecords,
  longhandContext,
} from './lib/longhand/canonicalize.js';
import { targetSupportOf } from './lib/longhand/targetSupport.js';
import runMerge from './lib/rules/selectorMerger.js';
import { buildRecords } from './lib/rules/buildRecords.js';
import { guardWindow } from './lib/rules/windowGuard.js';
import { assertRecordsMatchTree } from './lib/rules/treeMatch.js';
import { fillSummaries } from './lib/rules/selectorList.js';
import { writeBack } from './lib/rules/writeBack.js';
import { createRunContext } from '../ir/runContext.js';
import { TextTable } from '../../values/textTable.js';
import { assertValid, isBoolean } from '../../optionGuards.js';
/** @import {BlockRecords} from './lib/rules/blockRecords.js' */
/** @import {Root} from 'postcss' */

/**
 * The two longhand rounds of one run. Each reads the records of the run's
 * stylesheet and edits them through the round's context. The first round runs
 * before the merge transforms; the second runs after them, on the blocks they
 * left. The first round's whole-stylesheet fact, whether a column property is
 * set elsewhere, is carried to the second.
 */
class LonghandRounds {
  /** @type {ReturnType<typeof targetSupportOf>} */
  #support;
  /** @type {boolean} */
  #setsOtherColumn = false;

  /** @param {ReturnType<typeof targetSupportOf>} support */
  constructor(support) {
    this.#support = support;
  }

  /**
   * The first round, on the records the build made.
   *
   * @param {BlockRecords} records
   * @param {ReturnType<typeof createRunContext>} context
   * @return {void}
   */
  first(records, context) {
    const round = this.#roundOf(records, context);
    canonicalizeRecords(records, round);
    this.#setsOtherColumn = round.setsOtherColumn;
  }

  /**
   * The second round, on the records after the merge transforms.
   *
   * @param {BlockRecords} records
   * @param {ReturnType<typeof createRunContext>} context
   * @return {void}
   */
  second(records, context) {
    const round = this.#roundOf(records, context);
    // Carried over: a stale `true` only keeps columns unreduced, and any
    // column-setting declaration a merge moved sits in a block rescanned here.
    round.setsOtherColumn = this.#setsOtherColumn;
    canonicalizeRecords(records, round);
  }

  /**
   * @param {BlockRecords} records
   * @param {ReturnType<typeof createRunContext>} context
   * @return {ReturnType<typeof longhandContext>}
   */
  #roundOf(records, context) {
    const { placeShorthands, boxSupport, pairShorthands } = this.#support;
    return longhandContext(
      placeShorthands,
      boxSupport,
      pairShorthands,
      context,
      records
    );
  }
}

/**
 * Builds the records of the stylesheet, runs each transform on them in order,
 * and writes them back once.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers
 * @param {ReturnType<typeof createRunContext>} context
 * @param {readonly ((records: BlockRecords, browsers: readonly string[], context: ReturnType<typeof createRunContext>) => void)[]} transforms
 * @return {void}
 */
function runRecords(css, browsers, context, transforms) {
  const { records, nodes } = buildRecords(css, context);
  // Every rule's selector summaries are folded before any transform, so no
  // read fills one, and the tree check finds them even when rules are not merged.
  fillSummaries(records, context.tokenLists, browsers);
  const release = context.consistencyChecks
    ? guardWindow(context.textTable)
    : undefined;
  try {
    for (const transform of transforms) transform(records, browsers, context);
  } finally {
    release?.();
  }
  writeBack(records, nodes, context.tokenLists, context.textTable);
  assertRecordsMatchTree(records, nodes, context.tokenLists, browsers);
}

/** The transforms that run over the records, in order, for each path of the pass. */
const DEDUPE_THEN_MERGE = Object.freeze([discardDuplicates, runMerge]);
const DEDUPE_ONLY = Object.freeze([discardDuplicates]);
const MERGE_ONLY = Object.freeze([runMerge]);

/**
 * The merge transforms over one stylesheet, in the order the default preset
 * runs them: canonicalize every declaration block, remove duplicates, merge
 * rules, then canonicalize again every block still in the stylesheet.
 *
 * Removing duplicates keeps the last copy, so running it first can delete the
 * declaration that let an earlier one be dropped as overridden.
 *
 * Longhand merging and duplicate removal always run. Rule merging runs unless
 * `rules` is false.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers the resolved browser targets
 * @param {{ rules?: boolean }} [options]
 * @param {unknown} [_result] the PostCSS result, which the merge does not use
 * @param {TextTable} [textTable] the selector tokens the host walk left
 * @param {boolean} [consistencyChecks] whether the run checks its caches; the process default otherwise
 * @return {void}
 */
export function mergePass(
  css,
  browsers,
  { rules = true } = {},
  _result,
  textTable,
  consistencyChecks
) {
  const support = targetSupportOf(browsers);
  runTransforms(
    css,
    browsers,
    support,
    rules,
    createRunContext(textTable, consistencyChecks, support.features)
  );
}

/**
 * Runs the merge transforms of `mergePass` over one stylesheet with its run context.
 * Canonicalizing is not idempotent: a block the first round reduced can reduce
 * again, so every block still in the stylesheet gets the second round, as the
 * second merge-longhand run of the default preset gave it.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers
 * @param {ReturnType<typeof targetSupportOf>} support what the targets support, from `browsers`
 * @param {boolean} rules whether rules are merged
 * @param {ReturnType<typeof createRunContext>} context
 * @return {void}
 */
function runTransforms(css, browsers, support, rules, context) {
  const rounds = new LonghandRounds(support);
  runRecords(css, browsers, context, [
    (records, _browsers, run) => rounds.first(records, run),
    ...(rules ? DEDUPE_THEN_MERGE : DEDUPE_ONLY),
    (records, _browsers, run) => rounds.second(records, run),
  ]);
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
    const rounds = new LonghandRounds(support);
    runRecords(
      css,
      browsers,
      createRunContext(new TextTable(), undefined, support.features),
      [(records, _browsers, run) => rounds.first(records, run)]
    );
  },
  discardDuplicates(css, _browsers, consistencyChecks) {
    runRecords(
      css,
      [],
      createRunContext(undefined, consistencyChecks),
      DEDUPE_ONLY
    );
  },
  mergeRules(css, browsers, consistencyChecks) {
    runRecords(
      css,
      browsers,
      createRunContext(undefined, consistencyChecks),
      MERGE_ONLY
    );
  },
  dedupeThenMerge(css, browsers, consistencyChecks) {
    runRecords(
      css,
      browsers,
      createRunContext(undefined, consistencyChecks),
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
