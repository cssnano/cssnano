export const name = 'merge-selector-writers';

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

export const target = source('mergeState.js');
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
// The summary guard runs with it, since it holds the summaries that the
// merged rules of these writers must keep.
export const test = new URL(
  '../../../../../test/passes/merge/{selectorWriters,lib/rules/selectorSummaryGuard}.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'a merged rule takes its template from the rule merged, even when that one was merged',
    target: source('ruleRewrite.js'),
    find: '  const template = second.template === -1 ? secondIndex : second.template;',
    replace: '  const template = secondIndex;',
  },
  {
    name: 'write-back leaves the ownSemicolon of a merged rule unwritten',
    target: irSource('writeSelector.js'),
    find: '  node.raws.ownSemicolon = template.raws.ownSemicolon;',
    replace: '',
  },
  {
    name: 'write-back skips the whitespace the records hold',
    target: irSource('writeBack.js'),
    find: '  writeRawsOf(records, nodes, tokenLists, records.root.index);',
    replace: '',
  },
  {
    name: 'write-back assigns the whitespace of root children only',
    target: irSource('writeBack.js'),
    find: '    if (record.before !== null) node.raws.before = record.before;',
    replace:
      '    if (record.before !== null && container === records.root.index) node.raws.before = record.before;',
  },
  {
    name: 'takePlaceOf keeps the whitespace of the earlier entry',
    target: irSource('treeEdits.js'),
    find: '  records.entry(earlier).before = records.entry(later).before;',
    replace: '',
  },
  {
    name: 'store the joined selector list as text, dropping its tokens',
    target: irSource('writeSelector.js'),
    find: '  textTable.write(node, joinedList(record, tokenLists));',
    replace:
      "  textTable.setText(node, joinedList(record, tokenLists).map((token) => token[1]).join(''));",
  },
  {
    name: 'a merged rule takes no combined summaries of the two lists it is built from',
    target: source('ruleRewrite.js'),
    find: '  combineSummaries(receivingRecord, first, second);',
    replace: '',
  },
  {
    name: 'a merged rule takes no summaries of the selectors a group adds to it',
    target: source('ruleRewrite.js'),
    find: '  extendSummaries(\n    receivingRecord,\n    first.selectorIds.length + second.selectorIds.length,\n    tokenLists,\n    browsers\n  );',
    replace: '',
  },
  {
    name: 'an edit that adds selectors to a rule does not mark it, so write-back keeps its node text',
    target: source('selectorList.js'),
    find: '  own.marked = true;\n  extendSummaries(list, from, tokenLists, browsers);',
    replace: '  extendSummaries(list, from, tokenLists, browsers);',
  },
  {
    name: 'a rule that absorbs an earlier one is not marked, so write-back keeps its node text',
    target: source('selectorList.js'),
    find: '  own.marked = true;\n  writableIds(earlier).selectorIds = NO_SELECTORS;',
    replace: '  writableIds(earlier).selectorIds = NO_SELECTORS;',
  },
  {
    name: 'a merged rule is not marked when its summaries are combined, so write-back keeps its node text',
    target: source('selectorList.js'),
    find: '  own.compatible = first.compatible && second.compatible;\n  own.marked = true;',
    replace: '  own.compatible = first.compatible && second.compatible;',
  },
];
