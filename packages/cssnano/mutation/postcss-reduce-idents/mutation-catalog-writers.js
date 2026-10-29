export const name = 'postcss-reduce-idents: at-rule symbol writers';
export const target = new URL(
  '../../src/plugins/postcss-reduce-idents/lib/at-rule-symbols.js',
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
    name: 'write the renamed declaration as text, without its list',
    find: '        if (buffer.text() !== node.value) table.write(node, buffer.tokens());',
    replace:
      '        if (buffer.text() !== node.value) table.setText(node, buffer.text());',
  },
  {
    name: 'write the renamed at-rule prelude as text, without its list',
    find: '          table.write(rule, [encodedIdent(encoded)]);',
    replace: '          table.setText(rule, encoded);',
  },
];
