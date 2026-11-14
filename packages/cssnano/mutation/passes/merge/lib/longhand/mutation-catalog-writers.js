export const name = 'merge-longhand: shorthand fold writer';
export const target = new URL(
  '../../../../../src/passes/merge/lib/longhand/minifyShorthand.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../../../../test/pipeline/walkWriters.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'shorthand fold writer: rewrite a folded shorthand without its tokens',
    find: '  list.rewrite(position, decl.prop, folded.text, folded.tokens);',
    replace: '  list.rewrite(position, decl.prop, folded.text);',
  },
];
