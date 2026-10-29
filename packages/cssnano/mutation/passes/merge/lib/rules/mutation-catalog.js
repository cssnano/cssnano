export const name = 'merge-rules';

/**
 * @param {string} module
 * @return {string}
 */
function source(module) {
  return new URL(
    `../../../../../src/passes/merge/lib/rules/${module}`,
    import.meta.url
  ).href;
}

/**
 * @param {string} module
 * @return {string}
 */
function irSource(module) {
  return new URL(`../../../../../src/passes/ir/${module}`, import.meta.url)
    .href;
}

export const target = source('lastWriteIndex.js');
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../../../../test/passes/merge/lib/rules/*.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'treat logical and physical longhands as unrelated',
    target: source('lastWriteIndex.js'),
    find: '      if (opposite)',
    replace: '      if (false)',
  },
  {
    name: 'let all pass every other property',
    target: irSource('propertyTable.js'),
    find: "subjectToAll: lowercased !== 'direction' && lowercased !== 'unicode-bidi',",
    replace: 'subjectToAll: false,',
  },
  {
    name: 'treat a shorthand and its longhands as unrelated',
    target: irSource('propertyTable.js'),
    find: '      ? longhandsOf(name).map((longhand) => {',
    replace: '      ? [name].map((longhand) => {',
  },
  {
    name: 'join at-rules of one name whatever their conditions',
    target: source('sameContainer.js'),
    find: '    return nodeA.params === nodeB.params;',
    replace: '    return true;',
  },
  {
    name: 'join distinct anonymous layers',
    target: source('sameContainer.js'),
    find: 'return anonA && anonB && nodeA === nodeB;',
    replace: 'return anonA && anonB;',
  },
  {
    name: 'keep a downward join anchored at the earlier rule',
    target: source('nonAdjacentMerge.js'),
    find: "      if (direction === 'down') {",
    replace: '      if (false) {',
  },
  {
    name: 'move a block down in the backward pass across a conflicting write',
    target: source('nonAdjacentMerge.js'),
    find: '    if (!index.conflictsSinceIn(earlierDeclarations, laterPosition, keysOf)) {',
    replace: '    if (true) {',
  },
  {
    name: 'forget the writes of a block moved down in the backward pass',
    target: source('nonAdjacentMerge.js'),
    find: '      index.moveWrites(earlierDeclarations, laterPosition, keysOf);',
    replace: '',
  },
  {
    name: 'ignore !important when comparing declarations',
    target: source('declarations.js'),
    find: '    a.important === b.important &&\n',
    replace: '',
  },
  {
    name: 'ignore !important in the declaration key',
    target: irSource('declarationKey.js'),
    find: '    trie = step(trie, declaration.important === true);\n',
    replace: '',
  },
  {
    name: 'key vendor-prefixed pseudo-elements like standard ones',
    target: source('elementKeys.js'),
    find: '    if (isVendorExtension(pseudoName)) return null;\n',
    replace: '',
  },
  {
    name: 'a move leaves the summaries of the target stale',
    target: source('treeEdits.js'),
    find: '  invalidate(into);\n',
    replace: '',
  },
  {
    name: 'an append leaves the summaries of the receiving rule stale',
    target: source('treeEdits.js'),
    find: '  invalidate(receiving);\n',
    replace: '',
  },
  {
    name: 'an append leaves the summaries of the incoming rule stale',
    target: source('treeEdits.js'),
    find: '  invalidate(incoming);\n',
    replace: '',
  },
  {
    name: 'an append keeps the description of the incoming rule',
    target: source('treeEdits.js'),
    find: '  mergeState.forget(incoming);\n',
    replace: '',
  },
  {
    name: 'an append leaves the record of the receiving rule without its kept declarations',
    target: source('treeEdits.js'),
    find: '  record.takeDeclarations(kept);\n',
    replace: '',
  },
  {
    name: 'a removal of declarations leaves the summaries of the rule stale',
    target: source('treeEdits.js'),
    find: '  invalidate(rule);\n',
    replace: '',
  },
  {
    name: 'a removal of declarations leaves the record with the declarations it had',
    target: source('treeEdits.js'),
    find: '  record.takeDeclarations(getDecls(rule));\n',
    replace: '',
  },
  {
    name: 'taking declarations keeps the declaration keys of the record',
    target: source('ruleMeta.js'),
    find: '    this.#declarations = declarations;\n    this.#declarationKeys = undefined;\n',
    replace: '    this.#declarations = declarations;\n',
  },
  {
    name: 'a removal of rules leaves the summaries of the parent stale',
    target: source('treeEdits.js'),
    find: '  invalidate(parent);\n',
    replace: '',
  },
  {
    name: 'a removal of rules keeps the description of each removed rule',
    target: source('treeEdits.js'),
    find: '    mergeState.forget(/** @type {Rule} */ (node));\n',
    replace: '',
  },
  {
    name: 'a take-place leaves the summaries of the earlier rule stale',
    target: source('treeEdits.js'),
    find: '  invalidate(earlier);\n  earlier.remove();',
    replace: '  earlier.remove();',
  },
  {
    name: 'a rebuild leaves the summaries of each container stale',
    target: source('treeEdits.js'),
    find: '    invalidate(container);\n    container.removeAll();',
    replace: '    container.removeAll();',
  },
  {
    name: 'retiring a rule keeps its description',
    target: source('treeEdits.js'),
    find: 'export function retire(mergeState, rule) {\n  mergeState.forget(rule);',
    replace: 'export function retire(mergeState, rule) {\n  void mergeState;',
  },
  {
    name: 'a detach leaves the summaries of the ancestors stale',
    target: new URL(
      '../../../../../src/passes/merge/lib/deferredChildEdits.js',
      import.meta.url
    ).href,
    find: '  invalidate(node);\n  if (!pendingEdits.has(container))',
    replace: '  if (!pendingEdits.has(container))',
  },
  {
    name: 'applying the pending edits leaves the summaries of the container stale',
    target: new URL(
      '../../../../../src/passes/merge/lib/deferredChildEdits.js',
      import.meta.url
    ).href,
    find: '  invalidate(container);\n  const insertions',
    replace: '  const insertions',
  },
];
