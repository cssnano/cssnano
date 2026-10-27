export const name = 'pipeline-writers: host walk values';
export const target = new URL(
  '../../src/pipeline/traversal.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../test/pipeline/textTableWriters.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'assign a memo hit as a string, dropping its tokens',
    find: '      state.table.share(decl, /** @type {TableEntry} */ (known));',
    replace: '      state.table.setText(decl, known.text);',
  },
  {
    name: 'assign a folded value as a string, dropping its tokens',
    find: '    state.table.share(decl, /** @type {TableEntry} */ (folded));',
    replace: '    state.table.setText(decl, folded.text);',
  },
];
