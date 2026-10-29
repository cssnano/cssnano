export const name = 'postcss-merge-idents: reference rewrite writer';
export const target = new URL(
  '../../src/plugins/postcss-merge-idents/lib/valueRewriter.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../test/pipeline/symbolTableReaders.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'write the rewritten reference as text, without its list',
    find: '    if (buffer.text() !== value) {\n      table.write(decl, buffer.tokens());',
    replace:
      '    if (buffer.text() !== value) {\n      table.setText(decl, buffer.text());',
  },
];
