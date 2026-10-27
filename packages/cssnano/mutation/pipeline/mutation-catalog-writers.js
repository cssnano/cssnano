export const name = 'pipeline-writers: selector walk';
export const target = new URL(
  '../../src/pipeline/selectorReduce.js',
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
    name: 'assign a folded selector as a string, dropping its tokens',
    find: '  if (result !== read || tokens !== undefined) table.assignFolded(rule, folded);',
    replace:
      '  if (result !== read || tokens !== undefined) table.setText(rule, result);',
  },
  {
    name: 'assign an unchanged selector as a string, dropping its tokens',
    find: '  if (result !== read || tokens !== undefined) table.assignFolded(rule, folded);',
    replace: '  if (result !== read) table.assignFolded(rule, folded);',
  },
  {
    name: 'assign a memo hit as a string, dropping its tokens',
    find: '    table.assignFolded(rule, known);',
    replace: '    table.setText(rule, known.text);',
  },
];
