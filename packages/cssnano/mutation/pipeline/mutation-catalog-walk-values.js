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
    name: 'assign a folded value as a string, dropping its tokens',
    find: '  state.table.assignFolded(\n    decl,\n    foldPlan(entry, text, context, decl, state.helpers)\n  );',
    replace:
      '  state.table.setText(decl, foldPlan(entry, text, context, decl, state.helpers).text);',
  },
  {
    name: 'assign a folded prelude as a string, dropping its tokens',
    find: 'else state.table.assignFolded(atRule, folded);',
    replace: 'else state.table.setText(atRule, folded.text);',
  },
  {
    name: 'key one list map for both tokenizer modes',
    find: '  const lists = mode === undefined ? valueLists.plain : valueLists.unicodeRange;',
    replace: '  const lists = valueLists.plain;',
  },
];
