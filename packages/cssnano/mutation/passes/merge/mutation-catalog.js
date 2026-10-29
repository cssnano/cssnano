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
    name: 'skip reporting the first clone',
    find: '  mergeState.reportCreated(firstClone);\n',
    replace: '',
  },
  {
    name: 'skip reporting the second clone',
    find: '  mergeState.reportCreated(secondClone);\n',
    replace: '',
  },
  {
    name: 'skip reporting the leftover of a following rule',
    find: '      mergeState.reportCreated(leftover);\n',
    replace: '',
  },
];
