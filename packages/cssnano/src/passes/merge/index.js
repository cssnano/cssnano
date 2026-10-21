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

/** @import {Container, Root, Rule} from 'postcss' */

/** The transforms the pass runs, each named as the preset option that enables it. */
const allTransforms = new Set([
  'mergeLonghand',
  'discardDuplicates',
  'mergeRules',
]);

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
 * The merge transforms over one stylesheet, in the order the default preset
 * runs them: canonicalize every declaration block, remove duplicates, merge
 * rules, then canonicalize again every block still in the stylesheet.
 *
 * Removing duplicates keeps the last copy, so running it first can delete the
 * declaration that let an earlier one be dropped as overridden.
 *
 * A disabled transform does not act. Without merge-longhand, or without
 * removing duplicates or merging rules, nothing is recorded and the second
 * round is skipped.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers the resolved browser targets
 * @param {ReadonlySet<string>} [enabled] the transforms to run, all by default
 * @return {void}
 */
export function mergePass(css, browsers, enabled = allTransforms) {
  // Only rule merging reads the block table, so the table is attached only for it.
  const context = createRunContext(enabled.has('mergeRules') ? css : undefined);
  try {
    runTransforms(css, browsers, enabled, context);
  } finally {
    context.blocks.detach();
  }
}

/**
 * Runs the enabled transforms of `mergePass` over one stylesheet with its run context.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers
 * @param {ReadonlySet<string>} enabled
 * @param {ReturnType<typeof createRunContext>} context
 * @return {void}
 */
function runTransforms(css, browsers, enabled, context) {
  const longhand = enabled.has('mergeLonghand');
  const dedupe = enabled.has('discardDuplicates');
  const rules = enabled.has('mergeRules');

  // Only the longhand transform reads the target support, so skip building it otherwise.
  const { placeShorthands, boxSupport, pairShorthands, features } = longhand
    ? targetSupportOf(browsers)
    : /** @type {ReturnType<typeof targetSupportOf>} */ ({});

  // A second round is only needed when removing duplicates or merging rules
  // can expose a reduction the first round left, so only then is each block recorded.
  const second = longhand && (dedupe || rules);
  const first = longhandContext(placeShorthands, boxSupport, pairShorthands);
  /** @type {Container[]} */
  const blocks = [];
  if (longhand) {
    inLonghandSupport(features, () => {
      canonicalize(css, first);
      css.walk((node) => {
        if (node.type !== 'rule' && node.type !== 'atrule') return;
        if (rules) context.blocks.add(node);
        if (!node.nodes?.some((n) => n.type === 'decl')) return;
        canonicalize(node, first);
        if (second) blocks.push(node);
      });
      finishColumns(first);
    });
  } else if (rules) {
    css.walk((node) => {
      if (node.type === 'rule' || node.type === 'atrule') {
        context.blocks.add(node);
      }
    });
  }

  // The merge reports the rules it creates, which the second round also canonicalizes.
  if (second) context.createdBlocks = new Set();
  if (dedupe) discardDuplicates(css, context);

  // The merge uses its own caches, one set per run, as its plugin does.
  if (rules)
    runMerge(css, browsers, new Map(), new WeakSet(), new WeakMap(), context);

  if (!second) return;

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

/**
 * The `cssnano-merge` plugin: the merge transforms the preset enables, run in
 * one pass over the stylesheet. Without an `enabled` set, all of them run.
 *
 * @param {{ enabled?: ReadonlySet<string> }} [opts]
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  const { enabled = allTransforms } = opts;
  return {
    postcssPlugin: 'cssnano-merge',
    /** @param {import('postcss').Result} result */
    prepare(result) {
      // Only the longhand and rule transforms read the targets, so the others never resolve them.
      const browsers =
        enabled.has('mergeLonghand') || enabled.has('mergeRules')
          ? resolveTargets(opts, result)
          : [];
      return {
        /** @param {Root} css */
        OnceExit(css) {
          mergePass(css, browsers, enabled);
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;

export default pluginCreator;

/**
 * The creator of a pass that runs one transform, so each transform can be
 * tested alone as its own plugin.
 *
 * @param {'mergeLonghand' | 'discardDuplicates' | 'mergeRules'} name
 * @return {import('postcss').PluginCreator<object>}
 */
export function transformPlugin(name) {
  /** @type {import('postcss').PluginCreator<object>} */
  const creator = (opts = {}) =>
    pluginCreator({ ...opts, enabled: new Set([name]) });
  creator.postcss = true;
  return creator;
}
