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
    name: 'assign a committed border-radius shorthand as a string, dropping its tokens',
    find: '    textTable.record(written, value, shorthandTokens(horizontal, vertical));',
    replace: '    textTable.setText(written, value);',
  },
  {
    name: 'assign a folded border-radius shorthand as a string, dropping its tokens',
    find: '      textTable.record(decl, text, shorthandTokens(horizontal, vertical));',
    replace: '      textTable.setText(decl, text);',
  },
  {
    name: 'assign a folded border-radius corner as a string, dropping its tokens',
    find: '        textTable.record(\n          decl,\n          cornerParsed[0].raw,\n          joinRanges([cornerParsed[0]], [])\n        );',
    replace: '        textTable.setText(decl, cornerParsed[0].raw);',
  },
];
