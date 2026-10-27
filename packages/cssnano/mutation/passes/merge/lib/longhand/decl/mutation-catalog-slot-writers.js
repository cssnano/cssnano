export const name = 'merge-longhand: shorthand commit writer';
export const target = new URL(
  '../../../../../../src/passes/merge/lib/longhand/decl/slotVector.js',
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
    name: 'assign a committed shorthand in place as a string, dropping its tokens',
    find: '      textTable.write(toRemove[0], tokens);',
    replace: '      textTable.setText(toRemove[0], shorthandVal);',
  },
  {
    name: 'assign an inserted shorthand as a string, dropping its tokens',
    find: '    if (tokens) textTable.write(inserted, tokens);',
    replace: '    if (tokens) textTable.setText(inserted, shorthandVal);',
  },
];
