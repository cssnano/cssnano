export const name = 'merge-longhand: shorthand fold writer';
export const target = new URL(
  '../../../../../src/passes/merge/lib/longhand/minifyShorthand.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../../../../test/pipeline/textTableWriters.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'assign a folded shorthand as a string, dropping its tokens',
    find: '    table.share(decl, /** @type {TextEntry} */ (folded));',
    replace: '    table.setText(decl, folded.text);',
  },
];
