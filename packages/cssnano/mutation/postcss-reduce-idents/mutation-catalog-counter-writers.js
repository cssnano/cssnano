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
    name: 'write the renamed use without its list',
    find: '        );\n        writeValue(records, context, index, buffer.tokens());\n      }\n',
    replace:
      '        );\n        writeValue(records, context, index, []);\n      }\n',
  },
  {
    name: 'write the renamed definition without its list',
    find: '          if (buffer.text() !== value) {\n            writeValue(records, context, index, buffer.tokens());',
    replace:
      '          if (buffer.text() !== value) {\n            writeValue(records, context, index, []);',
  },
];
