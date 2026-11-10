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
    target: source('propertyWrites.js'),
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
    find: '        : step(trie, block.params);',
    replace: '        : trie;',
  },
  {
    name: 'join distinct anonymous layers',
    target: source('sameContainer.js'),
    find: '? step(step(trie, ANONYMOUS), block.index)',
    replace: '? step(trie, ANONYMOUS)',
  },
  {
    name: 'a block takes its context without the enclosing blocks',
    target: source('sameContainer.js'),
    find: 'let trie = step(step(keys.root, CONTEXT), parentContext);',
    replace: 'let trie = step(keys.root, CONTEXT);',
  },
  {
    name: 'rules nested in rules of different selectors share a context',
    target: source('sameContainer.js'),
    find: '    for (const id of /** @type {RuleRecord} */ (block).selectorIds)\n      trie = step(trie, id);',
    replace: '',
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
    find: '!index.conflictsSinceIn(records, earlierEntries, laterPosition, keysOf)',
    replace: 'true',
  },
  {
    name: 'forget the writes of a block moved down in the backward pass',
    target: source('nonAdjacentMerge.js'),
    find: '      index.moveWrites(records, earlierEntries, laterPosition, keysOf);\n      adopt(mergeState.records, earlier.index, later.index);',
    replace: '      adopt(mergeState.records, earlier.index, later.index);',
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
    name: 'a rule record skips the check of its declarations against the tree',
    target: source('treeMatch.js'),
    find: '!describesNode(item, nodeOf(nodes, item.index))',
    replace: 'false',
  },
  {
    name: 'a removal of a rule that leaves it in its chain',
    target: source('treeEdits.js'),
    find: '  records.detach(index);\n',
    replace: '',
  },
  {
    name: 'a removal of a rule set that leaves its rules in their chains',
    target: source('treeEdits.js'),
    find: '    arena.detach(index);\n',
    replace: '',
  },
  {
    name: 'a sweep that leaves an emptied block in its chain',
    target: source('ruleSequence.js'),
    find: '      remove(records, at);\n',
    replace: '',
  },
  {
    name: 'a move before a sibling that leaves the moved entry in its old chain',
    target: source('blockRecords.js'),
    find: '    this.detach(index);\n    this.#linkBefore(sibling, index);\n',
    replace: '    this.#linkBefore(sibling, index);\n',
  },
  {
    name: 'a move of children that unlinks the moved entries without linking them',
    target: source('arenaEdits.js'),
    find: '    records.moveLast(target, entry);\n',
    replace: '    records.detach(entry);\n',
  },
  {
    name: 'move into the later parent',
    target: source('ruleSequence.js'),
    find: '    const target = records.links.parentOf(first);\n    const source = records.links.parentOf(second);\n',
    replace:
      '    const target = records.links.parentOf(second);\n    const source = records.links.parentOf(first);\n',
  },
  {
    name: 'the ownership check accepts a block whose count differs from its chain',
    target: source('recordsCheck.js'),
    find: '    if (count !== links.childCount(block.index)) throw new Error(OUT_OF_STEP);\n  };\n  reach(records.root);\n  visitChildren(records.root);',
    replace: '  };\n  reach(records.root);\n  visitChildren(records.root);',
  },
  {
    name: 'a removal of declarations stamps no container',
    target: source('blockLinks.js'),
    find: '    this.#stamp(block);\n    this.#parent[index] = -1;\n',
    replace: '    this.#parent[index] = -1;\n',
  },
  {
    name: 'write-back keeps the parent of a child that moves between rules',
    target: source('writeBack.js'),
    find: '    for (const node of children) node.parent = undefined;\n',
    replace: '',
  },
  {
    name: 'write-back appends to a rule that keeps its old children',
    target: source('writeBack.js'),
    find: '    container.removeAll();\n  }\n  for (const { container, children, leading } of rebuilt) {',
    replace:
      "    if (container.type !== 'rule') container.removeAll();\n  }\n  for (const { container, children, leading } of rebuilt) {",
  },
  {
    name: 'write-back leaves a departed rule in its block',
    target: source('writeBack.js'),
    find: '  if (records.links.childCount(block.index) !== children.length) return true;\n',
    replace: '',
  },

  {
    name: 'an arena entry reuses the index of the entry placed before it',
    target: source('blockRecords.js'),
    find: '    entry.index = /** @type {ArenaIndex} */ (this.#entries.length);',
    replace:
      '    entry.index = /** @type {ArenaIndex} */ (Math.max(0, this.#entries.length - 1));',
  },
  {
    name: 'replacePair leaves the prev link of the rule after the replacement unset',
    target: source('ruleSequence.js'),
    find: '    if (following !== -1) this.#prev[following] = tail;',
    replace: '    if (following !== -1) void tail;',
  },
  {
    name: 'a drop does not climb to the droppable parent it empties',
    target: source('ruleSequence.js'),
    find: '      if (holder === -1) return;\n      at = holder;\n',
    replace: '      return;\n',
  },
  {
    name: 'a walk into a block starts at its last child',
    target: source('declarationScan.js'),
    find: '        entry = links.firstChild(nested.index);',
    replace: '        entry = links.lastChild(nested.index);',
  },
];
