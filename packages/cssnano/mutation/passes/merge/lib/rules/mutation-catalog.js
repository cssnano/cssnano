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
    find: "trie = step(step(trie, 'rule'), /** @type {RuleRecord} */ (block).selector);",
    replace: "trie = step(trie, 'rule');",
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
    find: '!index.conflictsSinceIn(earlierEntries, laterPosition, keysOf)',
    replace: 'true',
  },
  {
    name: 'forget the writes of a block moved down in the backward pass',
    target: source('nonAdjacentMerge.js'),
    find: '      index.moveWrites(earlierEntries, laterPosition, keysOf);\n      mergeState.records.adopt(earlier.index, later.index);',
    replace: '      mergeState.records.adopt(earlier.index, later.index);',
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
    name: 'an append leaves the record of the incoming rule live',
    target: source('treeEdits.js'),
    find: '  incoming.depart();\n',
    replace: '',
  },
  {
    name: 'removing declarations keeps the declaration keys of the record',
    target: source('ruleRecord.js'),
    find: '    } else {\n      this.#declarationKeys = undefined;\n    }',
    replace: '    }',
  },
  {
    name: 'a removal of rules leaves the record of each removed rule live',
    target: source('treeEdits.js'),
    find: '    record.depart();\n',
    replace: '',
  },
  {
    name: 'a merged-away rule with a shared selector leaves its record live',
    target: source('merge.js'),
    find: '    second.depart();\n',
    replace: '',
  },
  {
    name: 'absorbing an earlier rule leaves its record live',
    target: source('ruleRecord.js'),
    find: '    earlier.#departed = true;\n',
    replace: '',
  },
  {
    name: 'a rule record skips the check of its declarations against the tree',
    target: source('writeBack.js'),
    find: '      if (item instanceof DeclarationRecord && !describes(item)) {',
    replace: '      if (false) {',
  },
  {
    name: 'a takePlaceOf that leaves the later entry in its chain',
    target: source('blockLinks.js'),
    find: '    this.unlink(later);\n',
    replace: '',
  },
  {
    name: 'a removal of a rule that leaves it in its chain',
    target: source('treeEdits.js'),
    find: '  records.links.unlink(entry.index);\n',
    replace: '',
  },
  {
    name: 'a removal of a rule set that leaves its rules in their chains',
    target: source('treeEdits.js'),
    find: '    arena.links.unlink(index);\n    record.depart();\n',
    replace: '    record.depart();\n',
  },
  {
    name: 'a sweep that leaves an emptied block in its chain',
    target: source('ruleSequence.js'),
    find: '      links.unlink(at);\n',
    replace: '',
  },
  {
    name: 'a takePlaceOf that leaves the earlier entry in its old chain',
    target: source('blockLinks.js'),
    find: '    this.unlink(earlier);\n',
    replace: '',
  },
  {
    name: 'a move of children that unlinks the moved entries without linking them',
    target: source('blockRecords.js'),
    find: '      this.links.linkLast(target, entry);\n',
    replace: '',
  },
  {
    name: 'a move that leaves the moved rule in its old chain',
    target: source('blockRecords.js'),
    find: '  moveRule(target, record) {\n    this.links.unlink(record);\n',
    replace: '  moveRule(target, record) {\n',
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
    find: '    if (count !== block.count) throw new Error(OUT_OF_STEP);\n  };\n  reach(records.root);\n  visitChildren(records.root);',
    replace: '  };\n  reach(records.root);\n  visitChildren(records.root);',
  },
  {
    name: 'taking declarations hands over no record',
    target: source('blockRecords.js'),
    find: '    for (const declaration of taken) this.links.unlink(declaration.index);\n    return taken;',
    replace:
      '    for (const declaration of taken) this.links.unlink(declaration.index);\n    return [];',
  },
  {
    name: 'taking declarations removes the taken node at once',
    target: source('blockRecords.js'),
    find: '    for (const declaration of taken) this.links.unlink(declaration.index);\n    return taken;',
    replace:
      '    for (const declaration of taken) {\n      this.links.unlink(declaration.index);\n      declaration.node.remove();\n    }\n    return taken;',
  },
  {
    name: 'an append edits the node of the rule at once',
    target: source('blockRecords.js'),
    find: '    this.links.linkLast(rule.index, child.index);\n',
    replace:
      '    this.links.linkLast(rule.index, child.index);\n    rule.node.append(child.node);\n',
  },
  {
    name: 'an append leaves the rule record unedited',
    target: source('ruleRecord.js'),
    find: '  childLinked(child, atEnd) {\n    this.#edited = true;\n',
    replace: '  childLinked(child, atEnd) {\n',
  },
  {
    name: 'a removal of declarations leaves the rule record unedited',
    target: source('ruleRecord.js'),
    find: '  childUnlinked() {\n    this.#edited = true;\n',
    replace: '  childUnlinked() {\n',
  },
  {
    name: 'a taking of declarations leaves the rule record unedited',
    target: source('blockLinks.js'),
    find: '    if (holder instanceof RuleRecord) holder.childUnlinked();\n',
    replace: '',
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
    find: '  if (records.liveCount(block.index) !== nodes.length) return true;\n',
    replace: '',
  },
  {
    name: 'taking declarations keeps the declaration keys of the record',
    target: source('ruleRecord.js'),
    find: '  childUnlinked() {\n    this.#edited = true;\n    this.#declarationKeys = undefined;\n  }',
    replace: '  childUnlinked() {\n    this.#edited = true;\n  }',
  },

  {
    name: 'an arena entry reuses the index of the entry placed before it',
    target: source('blockRecords.js'),
    find: '    entry.index = this.#entries.length;',
    replace: '    entry.index = Math.max(0, this.#entries.length - 1);',
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
    find: '        entry = nested.first;',
    replace: '        entry = nested.last;',
  },
];
