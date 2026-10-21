import { resolveTargets } from '#utils/browser-targets';
import { discardDuplicates } from './lib/duplicates/discardDuplicates.js';
import {
  canonicalize,
  finishColumns,
  longhandContext,
} from './lib/longhand/canonicalize.js';
import { withTargetSupport } from './lib/longhand/isFallback.js';
import { clearSupportCache } from './lib/longhand/syntaxFeatures.js';
import { targetSupportOf } from './lib/longhand/targetSupport.js';
import runMerge from './lib/rules/selectorMerger.js';
import { createRunContext } from '../ir/runContext.js';
import { assertValid, isBoolean } from '../../optionGuards.js';

/** @import {Container, Root, Rule} from 'postcss' */

/**
 * Whether the node still hangs under the stylesheet. A block that a merge or a
 * removal dropped does not, and the second round leaves it alone.
 *
 * @param {Container} container
 * @param {Root} css
 * @return {boolean}
 */
function inTree(container, css) {
  /** @type {Container | undefined} */
  let node = container;
  for (; node; node = /** @type {Container | undefined} */ (node.parent)) {
    if (node === css) return true;
  }
  return false;
}

/**
 * Canonicalizes a block that is still in the stylesheet and holds a declaration.
 *
 * @param {Container} container
 * @param {Root} css
 * @param {ReturnType<typeof longhandContext>} context
 * @return {void}
 */
function canonicalizeInTree(container, css, context) {
  if (!container.nodes?.some((n) => n.type === 'decl')) return;
  if (inTree(container, css)) canonicalize(container, context);
}

/**
 * Runs `work` under the longhand support of the targets, as the longhand
 * plugin does, and clears the support cache afterwards.
 *
 * @template T
 * @param {ReturnType<typeof targetSupportOf>['features']} features
 * @param {() => T} work
 * @return {T}
 */
function inLonghandSupport(features, work) {
  try {
    return withTargetSupport(features, work);
  } finally {
    clearSupportCache();
  }
}

/**
 * The first longhand round: canonicalizes the stylesheet and every block that
 * holds a declaration, then finishes the columns. Each block is recorded in
 * `context` when a rule merge runs, and in `blocks` when a second round will
 * canonicalize it again.
 *
 * @param {Root} css
 * @param {ReturnType<typeof longhandContext>} first
 * @param {ReturnType<typeof createRunContext> | undefined} context the run context, when rules are merged
 * @param {Container[] | undefined} blocks receives each block that holds a declaration, when a second round runs
 * @return {void}
 */
function canonicalizeFirstRound(css, first, context, blocks) {
  canonicalize(css, first);
  css.walk((node) => {
    if (node.type !== 'rule' && node.type !== 'atrule') return;
    if (context) context.blocks.add(node);
    if (!node.nodes?.some((n) => n.type === 'decl')) return;
    canonicalize(node, first);
    if (blocks) blocks.push(node);
  });
  finishColumns(first);
}

/**
 * Runs the first longhand round under the longhand support of the targets.
 *
 * @param {Root} css
 * @param {ReturnType<typeof targetSupportOf>} support
 * @param {ReturnType<typeof createRunContext> | undefined} context
 * @param {Container[] | undefined} blocks
 * @return {ReturnType<typeof longhandContext>} the context of the round, which the second round reuses
 */
function runFirstRound(css, support, context, blocks) {
  const { placeShorthands, boxSupport, pairShorthands, features } = support;
  const first = longhandContext(placeShorthands, boxSupport, pairShorthands);
  inLonghandSupport(features, () =>
    canonicalizeFirstRound(css, first, context, blocks)
  );
  return first;
}

/**
 * Merges rules with the context of one run, as the rule-merging plugin does.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers
 * @param {ReturnType<typeof createRunContext>} context
 * @return {void}
 */
function mergeRules(css, browsers, context) {
  runMerge(css, browsers, context);
}

/**
 * The merge transforms over one stylesheet, in the order the default preset
 * runs them: canonicalize every declaration block, remove duplicates, merge
 * rules, then canonicalize again every block still in the stylesheet.
 *
 * Removing duplicates keeps the last copy, so running it first can delete the
 * declaration that let an earlier one be dropped as overridden.
 *
 * Longhand merging and duplicate removal always run. Rule merging runs unless
 * `rules` is false, which also leaves the block table unattached.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers the resolved browser targets
 * @param {{ rules?: boolean }} [options]
 * @return {void}
 */
export function mergePass(css, browsers, { rules = true } = {}) {
  // Only rule merging reads the block table, so the table is attached only for it.
  const context = createRunContext(rules ? css : undefined);
  try {
    runTransforms(css, browsers, rules, context);
  } finally {
    context.blocks.detach();
  }
}

/**
 * Runs the merge transforms of `mergePass` over one stylesheet with its run context.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers
 * @param {boolean} rules whether rules are merged
 * @param {ReturnType<typeof createRunContext>} context
 * @return {void}
 */
function runTransforms(css, browsers, rules, context) {
  const support = targetSupportOf(browsers);
  const { placeShorthands, boxSupport, pairShorthands, features } = support;

  // A second round canonicalizes every block recorded here, because removing
  // duplicates or merging rules can expose a reduction the first round left.
  /** @type {Container[]} */
  const blocks = [];
  const first = runFirstRound(
    css,
    support,
    rules ? context : undefined,
    blocks
  );

  // The merge reports the rules it creates, which the second round also canonicalizes.
  context.createdBlocks = new Set();
  discardDuplicates(css, context);

  if (rules) mergeRules(css, browsers, context);

  // Canonicalizing is not idempotent: a block the first round reduced can
  // reduce again, so every block still in the stylesheet gets the second round,
  // as the second merge-longhand run of the default preset gave it.
  const secondContext = longhandContext(
    placeShorthands,
    boxSupport,
    pairShorthands
  );
  // Carried over: a stale `true` only keeps columns unreduced, and any
  // column-setting declaration a merge moved sits in a block rescanned here.
  secondContext.setsOtherColumn = first.setsOtherColumn;
  secondContext.shorthandMemoTable = first.shorthandMemoTable;
  secondContext.familyRecords = first.familyRecords;
  inLonghandSupport(features, () => {
    canonicalize(css, secondContext);
    for (const block of blocks) canonicalizeInTree(block, css, secondContext);
    // A created rule is not in `blocks`, so it is canonicalized here.
    for (const rule of /** @type {Set<Rule>} */ (context.createdBlocks))
      canonicalizeInTree(rule, css, secondContext);
    finishColumns(secondContext);
  });
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
 * @type {Readonly<Record<'mergeLonghand' | 'discardDuplicates' | 'mergeRules', (css: Root, browsers: readonly string[]) => void>>}
 */
const transformHooks = Object.freeze({
  mergeLonghand(css, browsers) {
    runFirstRound(css, targetSupportOf(browsers), undefined, undefined);
  },
  discardDuplicates(css) {
    discardDuplicates(css, createRunContext());
  },
  mergeRules(css, browsers) {
    const context = createRunContext(css);
    try {
      css.walk((node) => {
        if (node.type === 'rule' || node.type === 'atrule') {
          context.blocks.add(node);
        }
      });
      mergeRules(css, browsers, context);
    } finally {
      context.blocks.detach();
    }
  },
});

/**
 * The creator of a pass that runs one transform, so each transform can be
 * tested alone as its own plugin.
 *
 * @param {'mergeLonghand' | 'discardDuplicates' | 'mergeRules'} name
 * @return {import('postcss').PluginCreator<object>}
 */
export function transformPlugin(name) {
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
          hook(css, browsers);
        },
      };
    },
  });
  creator.postcss = true;
  return creator;
}
