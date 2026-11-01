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
    find: '        : step(trie, node.params);',
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
    find: "trie = step(step(trie, 'rule'), node.selector);",
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
    find: '      claimed\n    );\n    this.#declarationKeys = undefined;\n',
    replace: '      claimed\n    );\n',
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
    target: source('ruleRecord.js'),
    find: '    if (!consistencyChecksEnabled() || this.#block !== -1) return;',
    replace: '    return;',
  },
  {
    name: 'a takePlaceOf that leaves the rule record on its old slot',
    target: source('treeEdits.js'),
    find: '    rule.place(laterSlot.block, laterSlot.position);\n',
    replace: '',
  },
  {
    name: 'a removal of a rule that leaves it in its slot',
    target: source('treeEdits.js'),
    find: '    const slot = records.slotOf(entry);\n    slot.rules.splice(slot.rules.indexOf(entry.index), 1);\n',
    replace: '    const slot = records.slotOf(entry);\n',
  },
  {
    name: 'a removal of a rule set that leaves its rules in their slots',
    target: source('treeEdits.js'),
    find: '    slot.rules.splice(slot.rules.indexOf(record.index), 1);\n    record.depart();\n',
    replace: '    record.depart();\n',
  },
  {
    name: 'a removal of a block that leaves its entry in place',
    target: source('treeEdits.js'),
    find: '  holder.children[position] = new Slot(holder.index, position, []);\n',
    replace: '',
  },
  {
    name: 'a takePlaceOf that leaves the entry of the earlier block in place',
    target: source('treeEdits.js'),
    find: '    holder.children[from] = new Slot(holder.index, from, []);\n',
    replace: '',
  },
  {
    name: 'a move of children that leaves the moved rules on their old slots',
    target: source('blockRecords.js'),
    find: '          record.place(target, slot.position);\n',
    replace: '',
  },
  {
    name: 'a sweep move that leaves the moved rule on its old slot',
    target: source('blockRecords.js'),
    find: '    holder.children.push(slot);\n    rule.place(target, slot.position);\n    return slot;\n',
    replace: '    holder.children.push(slot);\n    return slot;\n',
  },
  {
    name: 'move into the later parent',
    target: source('ruleSequence.js'),
    find: '    const target = /** @type {RuleRecord} */ (records.rule(first)).slotBlock;\n    const source = /** @type {RuleRecord} */ (records.rule(second)).slotBlock;',
    replace:
      '    const target = /** @type {RuleRecord} */ (records.rule(second)).slotBlock;\n    const source = /** @type {RuleRecord} */ (records.rule(first)).slotBlock;',
  },
  {
    name: 'the records check accepts a rule record that names another slot',
    target: source('writeBack.js'),
    find: '  if (mergeState.records.slotOf(record) !== slot) {\n    throw new Error(OUT_OF_STEP);\n  }\n',
    replace: '',
  },
  {
    name: 'taking declarations hands over no record',
    target: source('ruleChildren.js'),
    find: '        taken?.push(child);\n',
    replace: '',
  },
  {
    name: 'taking declarations removes the taken node at once',
    target: source('ruleChildren.js'),
    find: '        taken?.push(child);\n',
    replace: '        child.node.remove();\n        taken?.push(child);\n',
  },
  {
    name: 'an append edits the node of the rule at once',
    target: source('ruleRecord.js'),
    find: '    this.#edited = true;\n    if (isDeclarationChild)',
    replace:
      '    this.#edited = true;\n    this.node.append(node);\n    if (isDeclarationChild)',
  },
  {
    name: 'an append leaves the rule record unedited',
    target: source('ruleRecord.js'),
    find: '    this.#edited = true;\n    if (isDeclarationChild)',
    replace: '    if (isDeclarationChild)',
  },
  {
    name: 'a removal of declarations leaves the rule record unedited',
    target: source('ruleRecord.js'),
    find: '    if (claimed.size) this.#edited = true;\n  }\n',
    replace: '  }\n',
  },
  {
    name: 'a taking of declarations leaves the rule record unedited',
    target: source('ruleRecord.js'),
    find: '    if (claimed.size) this.#edited = true;\n    return taken;',
    replace: '    return taken;',
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
    find: '      taken\n    );\n    this.#declarationKeys = undefined;\n',
    replace: '      taken\n    );\n',
  },

  {
    name: 'recordRule reuses the index of the rule recorded before it',
    target: source('blockRecords.js'),
    find: '    record.index = this.#rules.length;',
    replace: '    record.index = Math.max(0, this.#rules.length - 1);',
  },
  {
    name: 'replacePair leaves the prev link of the rule after the replacement unset',
    target: source('ruleSequence.js'),
    find: '    if (following !== -1) this.#prev[following] = tail;',
    replace: '    if (following !== -1) void tail;',
  },
  {
    name: 'climb reads the child index instead of the parent index',
    target: source('blockRecords.js'),
    find: '    const parent = this.block(block.parent);',
    replace: '    const parent = this.block(block.index);',
  },
  {
    name: 'a skip target is read from the wrong block',
    target: source('declarationScan.js'),
    find: '    let jumps = this.#skips.get(block.index);',
    replace: '    let jumps = this.#skips.get(block.index - 1);',
  },
];
