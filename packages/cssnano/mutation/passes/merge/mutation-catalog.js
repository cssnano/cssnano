export const name = 'passes-merge';

/**
 * @param {string} module
 * @return {string}
 */
function source(module) {
  return new URL(
    `../../../src/passes/merge/lib/rules/${module}`,
    import.meta.url
  ).href;
}

/**
 * @param {string} module a path under `src/passes/ir/`
 * @return {string}
 */
function irSource(module) {
  return new URL(`../../../src/passes/ir/${module}`, import.meta.url).href;
}

/**
 * @param {string} module a path under `src/passes/merge/lib/`
 * @return {string}
 */
function passSource(module) {
  return new URL(`../../../src/passes/merge/lib/${module}`, import.meta.url)
    .href;
}

export const target = source('ruleRewrite.js');

// node --test expands this glob; the driver tests run the whole pass.
export const test = new URL('../../../test/passes/merge/*.js', import.meta.url)
  .href;

// One mutant per report site: the rule that `buildMergedRule` creates is no
// longer reported, so the driver's second round may skip it.
export const mutations = [
  {
    name: 'skip reporting the receiving block',
    find: '  mergeState.reportCreated(receivingBlock);\n',
    replace: '',
  },
  {
    name: 'skip reporting the first clone',
    find: '  mergeState.reportCreated(firstClone);\n',
    replace: '',
  },
  {
    name: 'skip reporting the second clone',
    find: '  mergeState.reportCreated(secondClone);\n',
    replace: '',
  },
  {
    name: 'skip reporting the leftover of a following rule',
    find: '      mergeState.reportCreated(leftover);\n',
    replace: '',
  },
  // One per invalidation of the block table in ruleRewrite.js.
  {
    name: 'skip invalidating the receiving rule of an append',
    find: '  invalidate(receiving);\n',
    replace: '',
  },
  {
    name: 'skip invalidating the incoming rule of an append',
    find: '  invalidate(incoming);\n',
    replace: '',
  },
  // The other invalidations are not mutated: skipping one is equivalent. The
  // tree listing changes only in `applyChildEdits`, which invalidates its
  // container, and each `takePlaceOf` skip has an earlier invalidation of the
  // same subtree with no read before the edit.
  {
    name: 'skip invalidating the parent of a declarationJoin detach',
    target: source('declarationJoin.js'),
    find: '  invalidate(parent);\n',
    replace: '',
  },
  {
    name: 'skip invalidating a rule withdrawn from a declaration join',
    target: source('declarationJoin.js'),
    find: '    invalidate(later);\n',
    replace: '',
  },
  {
    name: 'skip invalidating the container a ruleSequence write empties',
    target: source('ruleSequence.js'),
    find: '      invalidate(container);\n',
    replace: '',
  },
  {
    name: 'skip invalidating the earlier block that takes a later block without a move, forward pass',
    target: source('nonAdjacentMerge.js'),
    find: '      invalidate(earlier);\n      earlier.append(/** @type {ChildNode[]} */ (later.nodes).slice());\n      detach(later);\n      index.moveWrites(declarations, earlierPosition, keysOf);\n',
    replace:
      '      earlier.append(/** @type {ChildNode[]} */ (later.nodes).slice());\n      detach(later);\n      index.moveWrites(declarations, earlierPosition, keysOf);\n',
  },
  {
    name: 'skip invalidating the earlier block that takes a later block without a move, backward pass',
    target: source('nonAdjacentMerge.js'),
    find: "      invalidate(earlier);\n      earlier.append(/** @type {ChildNode[]} */ (later.nodes).slice());\n      detach(later);\n      return 'up';\n",
    replace:
      "      earlier.append(/** @type {ChildNode[]} */ (later.nodes).slice());\n      detach(later);\n      return 'up';\n",
  },
  // Settled containers: a visit that joined nothing is skipped until an edit.
  // Not mutated: settling after a visit that joined is equivalent, since every
  // join reaches an invalidation (receive, detach, joinBlock), which changes
  // the edit count and blocks the settle.
  {
    name: 'never settle a container that joined nothing',
    target: source('nonAdjacentMerge.js'),
    find: '  if (!joined && blocks.edits === edits) blocks.settle(root);\n',
    replace: '',
  },
  {
    name: 'keep a container settled through an edit that reaches it',
    target: irSource('blockTable.js'),
    find: '    this.#settled.delete(node);\n',
    replace: '',
  },
  {
    name: 'skip invalidating a container whose deferred edits apply',
    target: passSource('deferredChildEdits.js'),
    find: '  invalidate(container);\n  const insertions',
    replace: '  const insertions',
  },
];
