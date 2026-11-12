export const name = 'merge-longhand: declaration commit writes';
export const target = new URL(
  '../../../../../../src/passes/merge/lib/rules/arenaEdits.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../../../../../test/passes/merge/lib/rules/commitDeclarations.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'intern a committed value without its tokens, so the text is tokenized again',
    find: '    item.value,\n    item.tokens\n  );',
    replace: '    item.value\n  );',
  },
];
