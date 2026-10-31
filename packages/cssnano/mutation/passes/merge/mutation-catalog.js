export const name = 'passes-merge';

/**
 * @param {string} module
 * @return {string}
 */
function source(module) {
  return new URL(
    `../../../src/passes/merge/lib/rules/${module}`,
    import.meta.url
  ).href;
}

export const target = source('ruleRewrite.js');

// node --test expands this glob; the driver tests run the whole pass.
export const test = new URL('../../../test/passes/merge/*.js', import.meta.url)
  .href;

// One mutant per report site: the rule that `buildMergedRule` creates is no
// longer reported, so the driver's second round may skip it.
export const mutations = [
  {
    name: 'skip reporting the receiving block',
    find: '  mergeState.reportCreated(receivingBlock);\n',
    replace: '',
  },
  {
    name: 'skip reporting a kept leftover',
    find: '  mergeState.reportCreated(record.node);\n',
    replace: '',
  },
  {
    name: 'depart a leftover that keeps a child',
    find: '  mergeState.reportCreated(record.node);\n  return [record];',
    replace:
      '  mergeState.reportCreated(record.node);\n  depart(mergeState, record);\n  return [record];',
  },
  {
    name: 'keep a leftover that holds no child in the tree',
    find: '    depart(mergeState, record);\n    return [];',
    replace: '    return [];',
  },
];
