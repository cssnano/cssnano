export const name = 'merge-selector-writers';

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

export const target = source('mergeState.js');
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
// The summary guard runs with it, since it holds the summaries that the
// merged rules of these writers must keep.
export const test = new URL(
  '../../../test/merge/{selectorWriters,rules/selectorSummaryGuard,rules/parsedPrefix}.test.js',
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
    target: irSource('tree/writeSelector.js'),
    find: '  node.raws.ownSemicolon = template.raws.ownSemicolon;',
    replace: '',
  },
  {
    name: 'write-back skips the whitespace the records hold',
    target: irSource('tree/writeBack.js'),
    find: '      if (record.before !== null) node.raws.before = record.before;\n      else delete node.raws.before;\n',
    replace: '',
  },
  {
    name: 'write-back assigns the whitespace of root children only',
    target: irSource('tree/writeBack.js'),
    find: '    if (record.before !== null) node.raws.before = record.before;',
    replace:
      '    if (record.before !== null && container === this.records.root) node.raws.before = record.before;',
  },
  {
    name: 'takePlaceOf keeps the whitespace of the earlier entry',
    target: irSource('treeEdits.js'),
    find: '  records.entry(earlier).before = before;',
    replace: '',
  },
  {
    name: 'keep the raw of a rewritten selector, which restores the comments the text dropped',
    target: irSource('tree/writeSelector.js'),
    find: '        delete selector.raws.selector;',
    replace: '',
  },
  {
    name: 'a merged rule takes no combined summaries of the two lists it is built from',
    target: source('ruleRewrite.js'),
    find: '  combineSummaries(receivingRecord, first, second, pairIds.length);',
    replace: '',
  },
  {
    name: 'a merged rule takes no summaries of the selectors a group adds to it',
    target: source('ruleRewrite.js'),
    find: '  extendSummaries(receivingRecord, pairIds.length, tokenLists, browsers);',
    replace: '',
  },
  {
    name: 'a joined list whose parsed prefix is capped by a dropped selector keeps the second list prefix',
    target: irSource('selectorList.js'),
    find: '  return pairLength === length + second.selectorIds.length\n    ? length + second.parsedPrefix\n    : length;',
    replace: '  return length + second.parsedPrefix;',
  },
  {
    name: 'an edit that adds selectors to a rule does not mark it, so write-back keeps its node text',
    target: irSource('selectorList.js'),
    find: '  own.marked = true;\n  extendSummaries(list, from, tokenLists, browsers);',
    replace: '  extendSummaries(list, from, tokenLists, browsers);',
  },
  {
    name: 'a rule that absorbs an earlier one is not marked, so write-back keeps its node text',
    target: irSource('selectorList.js'),
    find: '  own.marked = true;\n  const moved = writableIds(earlier);',
    replace: '  const moved = writableIds(earlier);',
  },
  {
    name: 'a merged rule is not marked when its summaries are combined, so write-back keeps its node text',
    target: irSource('selectorList.js'),
    find: '  own.compatible = first.compatible && second.compatible;\n  own.marked = true;',
    replace: '  own.compatible = first.compatible && second.compatible;',
  },
];
