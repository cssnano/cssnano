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
    name: 'an append leaves the record of the incoming rule live',
    target: source('treeEdits.js'),
    find: '  departing.depart();\n',
    replace: '',
  },
  {
    name: 'an append leaves the record of the receiving rule without its kept declarations',
    target: source('treeEdits.js'),
    find: '  record.takeDeclarations(kept);\n',
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
    name: 'a removal of rules leaves the record of each removed rule live',
    target: source('treeEdits.js'),
    find: '    mergeState.meta(/** @type {Rule} */ (node)).depart();\n',
    replace: '',
  },
  {
    name: 'departing a rule leaves its record live',
    target: source('treeEdits.js'),
    find: 'export function depart(mergeState, rule) {\n  mergeState.meta(rule).depart();',
    replace: 'export function depart(mergeState, rule) {\n  void mergeState;',
  },
  {
    name: 'absorbing an earlier rule leaves its record live',
    target: source('ruleMeta.js'),
    find: '    earlier.#departed = true;\n',
    replace: '',
  },
  {
    name: 'meta skips the check of the declarations against the tree',
    target: source('mergeState.js'),
    find: '    if (consistencyChecksEnabled() && !meta.departed) {',
    replace: '    if (false) {',
  },
  {
    name: 'a takePlaceOf that leaves the rule record on its old slot',
    target: source('treeEdits.js'),
    find: '    mergeState.meta(rule).place(laterSlot);\n',
    replace: '',
  },
  {
    name: 'a removal of a rule that leaves it in its slot',
    target: source('treeEdits.js'),
    find: '    slot.rules.splice(slot.rules.indexOf(node), 1);\n',
    replace: '',
  },
  {
    name: 'a removal of a rule set that leaves its rules in their slots',
    target: source('treeEdits.js'),
    find: '    slot.rules.splice(slot.rules.indexOf(rule), 1);\n  }\n',
    replace: '  }\n',
  },
  {
    name: 'a removal of a block that leaves its entry in place',
    target: source('treeEdits.js'),
    find: '  holder.children[position] = new Slot(holder, position, []);\n',
    replace: '',
  },
  {
    name: 'a takePlaceOf that leaves the entry of the earlier block in place',
    target: source('treeEdits.js'),
    find: '    holder.children[from] = new Slot(holder, from, []);\n',
    replace: '',
  },
  {
    name: 'a move of children that leaves the moved rules on their old slots',
    target: source('blockRecords.js'),
    find: '          meta.place(slot);\n',
    replace: '',
  },
  {
    name: 'a sweep move that leaves the moved rule on its old slot',
    target: source('blockRecords.js'),
    find: '    records.metaOf(rule).place(slot);\n',
    replace: '',
  },
  {
    name: 'move into the later parent',
    target: source('ruleSequence.js'),
    find: '    const target = first.slot.block;\n    const source = second.slot.block;\n    if (target === source) return false;\n    source.changed(-1);\n    target.changed(1);\n    second.slot = target.moveRule(second.rule, second.slot, this.#records);',
    replace:
      '    const target = second.slot.block;\n    const source = first.slot.block;\n    if (target === source) return false;\n    source.changed(-1);\n    target.changed(1);\n    first.slot = target.moveRule(first.rule, first.slot, this.#records);',
  },
  {
    name: 'the records check accepts a rule record that names another slot',
    target: source('treeEdits.js'),
    find: '  if (meta.slot !== slot) throw new Error(OUT_OF_STEP);\n',
    replace: '',
  },
];
