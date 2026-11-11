import { resolveTargets } from '#utils/browser-targets';
import { discardDuplicates } from './lib/duplicates/discardDuplicates.js';
import {
  canonicalize,
  finishColumns,
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
/** @import {AtRule, Container, Root, Rule} from 'postcss' */

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
 * The first longhand round: canonicalizes the stylesheet and every block that
 * holds a declaration, then finishes the columns. Each such block is recorded
 * in `blocks` when a second round will canonicalize it again.
 *
 * @param {Root} css
 * @param {ReturnType<typeof longhandContext>} first
 * @param {Set<Container> | undefined} blocks receives each block that holds a declaration, when a second round runs
 * @param {readonly (Rule | AtRule)[] | undefined} reached the rules and at-rules of the stylesheet in
 *   document order, when the host walk collected them; the stylesheet is walked otherwise
 * @return {void}
 */
function canonicalizeFirstRound(css, first, blocks, reached) {
  canonicalize(css, first);
  /** @param {import('postcss').ChildNode} node */
  const visit = (node) => {
    if (node.type !== 'rule' && node.type !== 'atrule') return;
    if (!node.nodes?.some((n) => n.type === 'decl')) return;
    canonicalize(node, first);
    if (blocks) blocks.add(node);
  };
  if (reached) {
    for (const node of reached) visit(node);
  } else {
    css.walk(visit);
  }
  finishColumns(first);
}

/**
 * Runs the first longhand round under the longhand support of the targets.
 *
 * @param {Root} css
 * @param {ReturnType<typeof targetSupportOf>} support
 * @param {Set<Container> | undefined} blocks
 * @param {ReturnType<typeof createRunContext>} context the run whose tokens and support the round reads
 * @param {readonly (Rule | AtRule)[]} [reached] the rules and at-rules the host walk reached
 * @return {ReturnType<typeof longhandContext>} the context of the round, which the second round reuses
 */
function runFirstRound(css, support, blocks, context, reached) {
  const { placeShorthands, boxSupport, pairShorthands } = support;
  const first = longhandContext(
    placeShorthands,
    boxSupport,
    pairShorthands,
    context.textTable,
    context.features
  );
  canonicalizeFirstRound(css, first, blocks, reached);
  return first;
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
  writeBack(
    records,
    nodes,
    context.tokenLists,
    context.textTable,
    context.createdBlocks
  );
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
 * @param {readonly (Rule | AtRule)[]} [reached] the rules and at-rules the host walk reached,
 *   in document order, so the pass need not walk the stylesheet to find them
 * @param {boolean} [consistencyChecks] whether the run checks its caches; the process default otherwise
 * @return {void}
 */
export function mergePass(
  css,
  browsers,
  { rules = true } = {},
  _result,
  textTable,
  reached,
  consistencyChecks
) {
  runTransforms(
    css,
    browsers,
    rules,
    createRunContext(
      textTable,
      consistencyChecks,
      targetSupportOf(browsers).features
    ),
    reached
  );
}

/**
 * Runs the merge transforms of `mergePass` over one stylesheet with its run context.
 *
 * @param {Root} css
 * @param {readonly string[]} browsers
 * @param {boolean} rules whether rules are merged
 * @param {ReturnType<typeof createRunContext>} context
 * @param {readonly (Rule | AtRule)[] | undefined} reached
 * @return {void}
 */
function runTransforms(css, browsers, rules, context, reached) {
  const support = targetSupportOf(browsers);
  const { placeShorthands, boxSupport, pairShorthands } = support;

  // A second round canonicalizes every block recorded here, because removing
  // duplicates or merging rules can expose a reduction the first round left.
  // The merge adds each rule it creates to the same set, which the second
  // round also canonicalizes.
  /** @type {Set<Container>} */
  const blocks = new Set();
  const first = runFirstRound(css, support, blocks, context, reached);

  context.createdBlocks = blocks;
  runRecords(css, browsers, context, rules ? DEDUPE_THEN_MERGE : DEDUPE_ONLY);

  // Canonicalizing is not idempotent: a block the first round reduced can
  // reduce again, so every block still in the stylesheet gets the second round,
  // as the second merge-longhand run of the default preset gave it.
  const secondContext = longhandContext(
    placeShorthands,
    boxSupport,
    pairShorthands,
    context.textTable,
    context.features
  );
  // Carried over: a stale `true` only keeps columns unreduced, and any
  // column-setting declaration a merge moved sits in a block rescanned here.
  secondContext.setsOtherColumn = first.setsOtherColumn;
  canonicalize(css, secondContext);
  for (const block of blocks) canonicalizeInTree(block, css, secondContext);
  finishColumns(secondContext);
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
    runFirstRound(
      css,
      support,
      undefined,
      createRunContext(new TextTable(), undefined, support.features)
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
