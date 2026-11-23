export const name = 'merge-rules';

/**
 * @param {string} module
 * @return {string}
 */
function source(module) {
  return new URL(`../../../src/merge/rules/${module}`, import.meta.url).href;
}

/**
 * @param {string} module
 * @return {string}
 */
function irSource(module) {
  return new URL(`../../../src/ir/${module}`, import.meta.url).href;
}

export const target = source('lastWriteIndex.js');
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../../test/{merge/rules/*.js,{postcss-normalize-whitespace/normalizeRaws,postcss-normalize-charset/charset,postcss-discard-empty/discardRecords,postcss-unique-selectors/uniqueSelectors}.test.js,ir/*.js,ir/tree/*.js,run/{runContext,runDriver,selectorVerdicts}.test.js}',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'an unknown property conflicts only with unknown writes',
    target: irSource('propertyWrites.js'),
    find: '    if (!keys.known) return this.#lastAny;',
    replace: '    if (!keys.known) return this.#lastUnknown;',
  },
  {
    name: 'a known property ignores the unknown writes',
    target: irSource('propertyWrites.js'),
    find: '    return Math.max(newest, this.#lastUnknown);',
    replace: '    return newest;',
  },
  {
    name: 'an unknown property takes only the unknown write positions',
    target: irSource('writePositions.js'),
    find: '    if (!keys.known) return firstUnclaimedIn(this.#any, claims);',
    replace:
      '    if (!keys.known) return firstUnclaimedIn(this.#unknown, claims);',
  },
  {
    name: 'a known property skips the unknown write positions',
    target: irSource('writePositions.js'),
    find: '    return earliest(first, firstUnclaimedIn(this.#unknown, claims));',
    replace: '    return first;',
  },
  {
    name: 'treat logical and physical longhands as unrelated',
    target: irSource('propertyWrites.js'),
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
    target: irSource('tree/sameContainer.js'),
    find: '        : step(trie, block.preludeId);',
    replace: '        : trie;',
  },
  {
    name: 'join distinct anonymous layers',
    target: irSource('tree/sameContainer.js'),
    find: '? step(step(trie, ANONYMOUS), block.index)',
    replace: '? step(trie, ANONYMOUS)',
  },
  {
    name: 'a block takes its context without the enclosing blocks',
    target: irSource('tree/sameContainer.js'),
    find: 'let trie = step(step(keys.root, CONTEXT), parentContext);',
    replace: 'let trie = step(keys.root, CONTEXT);',
  },
  {
    name: 'rules nested in rules of different selectors share a context',
    target: irSource('tree/sameContainer.js'),
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
    find: '!index.conflictsSinceIn(records, earlierEntries, laterPosition)',
    replace: 'true',
  },
  {
    name: 'forget the writes of a block moved down in the backward pass',
    target: source('nonAdjacentMerge.js'),
    find: '    index.moveWrites(records, earlierEntries, laterPosition);\n    adopt(records, earlier.index, later.index);',
    replace: '    adopt(records, earlier.index, later.index);',
  },
  {
    name: 'ignore !important in the declaration key',
    target: irSource('declarationKey.js'),
    find: 'valueList * 2 + (important ? 1 : 0)',
    replace: 'valueList * 2',
  },
  {
    name: 'ignore !important in the key of a hack-prefixed declaration',
    target: irSource('declarationKey.js'),
    find: '    trie = step(trie, important);\n',
    replace: '',
  },
  {
    name: 'number a property name by the property it resolves to',
    target: irSource('propertyTable.js'),
    find: '    const lowercased = propertyNameKey(prop);\n    let keys = this.#keys.get(lowercased);',
    replace:
      '    const lowercased = resolveProperty(propertyNameKey(prop)).name;\n    let keys = this.#keys.get(lowercased);',
  },
  {
    name: 'build the keys of a property name again on every use',
    target: irSource('propertyTable.js'),
    find: '      this.#keys.set(lowercased, keys);\n',
    replace: '',
  },
  {
    name: 'key vendor-prefixed pseudo-elements like standard ones',
    target: irSource('elementKeys.js'),
    find: '    if (isVendorExtension(pseudoName)) return null;\n',
    replace: '',
  },
  {
    name: 'a rule record skips the check of its declarations against the tree',
    target: irSource('tree/treeMatch.js'),
    find: '!describesNode(tokenLists, item, nodeOf(nodes, item.index))',
    replace: 'false',
  },
  {
    name: 'a removal of a rule that leaves it in its chain',
    target: irSource('treeEdits.js'),
    find: '    if (next !== -1) records.entry(next).before = records.entry(index).before;\n  }\n  records.detach(index);\n',
    replace:
      '    if (next !== -1) records.entry(next).before = records.entry(index).before;\n  }\n',
  },
  {
    name: 'a removal of a rule set that leaves its rules in their chains',
    target: irSource('treeEdits.js'),
    find: '    remove(arena, index);\n',
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
    target: irSource('blockRecords.js'),
    find: '    this.detach(index);\n    this.#linkBefore(sibling, index);\n',
    replace: '    this.#linkBefore(sibling, index);\n',
  },
  {
    name: 'a clone that drops the support its source required',
    target: irSource('arenaEdits.js'),
    find: '  record.inheritedSupport = item.inheritedSupport;\n',
    replace: '',
  },
  {
    name: 'a move of children that unlinks the moved entries without linking them',
    target: irSource('arenaEdits.js'),
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
    target: irSource('tree/recordsCheck.js'),
    find: '    if (count !== links.childCount(block.index)) throw new Error(OUT_OF_STEP);\n',
    replace: '',
  },
  {
    name: 'a removal of declarations stamps no container',
    target: irSource('blockLinks.js'),
    find: '    this.#stamp(block);\n    this.#parent[index] = -1;\n',
    replace: '    this.#parent[index] = -1;\n',
  },
  {
    name: 'write-back keeps the parent of a child that moves between rules',
    target: irSource('tree/writeBack.js'),
    find: '    for (const node of children) node.parent = undefined;\n',
    replace: '',
  },
  {
    name: 'write-back appends to a rule that keeps its old children',
    target: irSource('tree/writeBack.js'),
    find: '    container.removeAll();\n  }\n  for (const { container, children } of rebuilt) {',
    replace:
      "    if (container.type !== 'rule') container.removeAll();\n  }\n  for (const { container, children } of rebuilt) {",
  },
  {
    name: 'write-back rebuilds no edited container',
    target: irSource('tree/writeBack.js'),
    find: '    if (records.links.isEdited(container.index)) {\n',
    replace: '    if (false) {\n',
  },

  {
    name: 'an arena entry reuses the index of the entry placed before it',
    target: irSource('blockRecords.js'),
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
