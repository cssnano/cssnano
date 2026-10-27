export const name = 'merge-longhand: border-radius writers';
export const target = new URL(
  '../../../../../../src/passes/merge/lib/longhand/decl/borderRadiusReducer.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../../../../../test/pipeline/textTableWriters.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'assign a folded border-radius shorthand as a string, dropping its tokens',
    find: '      textTable.write(decl, shorthandTokens(horizontal, vertical));',
    replace:
      '      textTable.setText(decl, shorthandText(horizontal, vertical));',
  },
  {
    name: 'assign a folded border-radius corner as a string, dropping its tokens',
    find: '        textTable.write(decl, joinRanges([cornerParsed[0]], []));',
    replace: '        textTable.setText(decl, cornerParsed[0].raw);',
  },
];
