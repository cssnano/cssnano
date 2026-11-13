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
    name: 'build the list fold without the list read for its source',
    find: 'const buffer = new ValueBuffer(undefined, entry.mode, shared);',
    replace:
      'const buffer = new ValueBuffer(undefined, entry.mode, undefined);',
  },
  {
    name: 'assign a folded node as a string, dropping its tokens',
    find: '    table.assignFolded(node, folded);',
    replace: '    table.setText(node, folded.text);',
  },
  {
    name: 'assign an unchanged node as a string, dropping its tokens',
    find: '  } else if (folded.text !== read || folded.tokens !== undefined) {',
    replace: '  } else if (folded.text !== read) {',
  },
];
