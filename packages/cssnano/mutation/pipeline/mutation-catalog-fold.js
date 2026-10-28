export const name = 'pipeline-writers: shared fold';
export const target = new URL('../../src/pipeline/plan.js', import.meta.url)
  .href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../test/pipeline/textTableWriters.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'build the value buffer without the list read for its text',
    find: '  let buffer = new ValueBuffer(text, entry.mode, lists?.get(text));',
    replace: '  let buffer = new ValueBuffer(text, entry.mode);',
  },
  {
    name: 'assign a folded node as a string, dropping its tokens',
    find: '    table.assignFolded(node, folded);',
    replace: '    table.setText(node, folded.text);',
  },
  {
    name: 'assign an unchanged node as a string, dropping its tokens',
    find: '  if (folded.text !== read || folded.tokens !== undefined) {',
    replace: '  if (folded.text !== read) {',
  },
];
