export const name = 'postcss-reduce-idents: counter symbol writers';
export const target = new URL(
  '../../src/plugins/postcss-reduce-idents/lib/counter.js',
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
    name: 'write the renamed use as text, without its list',
    find: '        table.write(decl, buffer.tokens());',
    replace: '        table.setText(decl, buffer.text());',
  },
  {
    name: 'write the renamed definition as text, without its list',
    find: '          if (buffer.text() !== decl.value) table.write(decl, buffer.tokens());',
    replace:
      '          if (buffer.text() !== decl.value) table.setText(decl, buffer.text());',
  },
];
