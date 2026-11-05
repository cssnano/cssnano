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
export const test = new URL(
  '../../../../../test/passes/merge/selectorWriters.test.js',
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
    target: source('writeBack.js'),
    find: '  raws.ownSemicolon = source.ownSemicolon;',
    replace: '',
  },
  {
    name: 'write-back skips the whitespace the records hold',
    target: source('writeBack.js'),
    find: '  for (const { index } of rebuilt) writeBefore(records, index);',
    replace: '',
  },
  {
    name: 'write-back assigns the whitespace of root children only',
    target: source('writeBack.js'),
    find: '    if (before !== null) records.nodeOf(entry).raws.before = before;',
    replace:
      '    if (before !== null && container === records.root.index) records.nodeOf(entry).raws.before = before;',
  },
  {
    name: 'takePlaceOf keeps the whitespace of the earlier entry',
    target: source('treeEdits.js'),
    find: '  earlier.before = later.before;',
    replace: '',
  },
  {
    name: 'store the joined selector list as text, dropping its tokens',
    target: source('writeBack.js'),
    find: '        textTable.write(record.node, list);\n        record.markStored();',
    replace:
      '        textTable.setText(record.node, tokensText(list));\n        record.markStored();',
  },
  {
    name: 'store a clone or joined rule as text, dropping its tokens',
    target: source('mergeState.js'),
    find: '    if (tokensText(list) === record.selector) record.setTokens(list);',
    replace: '    if (tokensText(list) === record.selector) void list;',
  },
  {
    name: 'forget the rules a merge spelled, so their selector is never marked',
    target: source('mergeState.js'),
    find: '    record.setSelector(record.selectorText());\n    record.mark();',
    replace: '    record.setSelector(record.selectorText());',
  },
  {
    name: 'drop the token ranges of the selectors a rule gains by repeated declarations',
    target: source('mergeState.js'),
    find: '    const from = own === null ? null : this.piecesOf(source);',
    replace: '    const from = null;',
  },
];
