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
    name: 'write the renamed declaration without its list',
    find: '          writeValue(records, context, index, buffer.tokens());',
    replace: '          writeValue(records, context, index, []);',
  },
  {
    name: 'write the renamed at-rule prelude without its list',
    find: '          writePrelude(context, entry, [encodedIdent(encoded)]);',
    replace: '          writePrelude(context, entry, []);',
  },
];
