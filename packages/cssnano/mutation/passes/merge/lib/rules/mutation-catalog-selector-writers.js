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
    find: '  const template = second.template === -1 ? second.index : second.template;',
    replace: '  const template = second.index;',
  },
  {
    name: 'write-back leaves the ownSemicolon of a merged rule unwritten',
    target: source('writeSelector.js'),
    find: '  raws.ownSemicolon = source.ownSemicolon;',
    replace: '',
  },
  {
    name: 'write-back skips the whitespace the records hold',
    target: source('writeBack.js'),
    find: '  for (const { index } of rebuilt) writeBefore(records, nodes, index);',
    replace: '',
  },
  {
    name: 'write-back assigns the whitespace of root children only',
    target: source('writeBack.js'),
    find: '      /** @type {ChildNode} */ (nodeOf(nodes, entry)).raws.before = before;',
    replace:
      '      if (container === records.root.index) /** @type {ChildNode} */ (nodeOf(nodes, entry)).raws.before = before;',
  },
  {
    name: 'takePlaceOf keeps the whitespace of the earlier entry',
    target: source('treeEdits.js'),
    find: '  records.entry(earlier).before = records.entry(later).before;',
    replace: '',
  },
  {
    name: 'store the joined selector list as text, dropping its tokens',
    target: source('writeSelector.js'),
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
    name: 'forget the rules a merge spelled, so their selector is never marked',
    target: source('selectorList.js'),
    find: '    this.#selector = selector;\n    writableIds(this).marked = true;',
    replace: '    this.#selector = selector;',
  },
];
