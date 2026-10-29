export const name = 'postcss-reduce-idents: grid-template symbol writers';
export const target = new URL(
  '../../src/plugins/postcss-reduce-idents/lib/grid-template.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../test/pipeline/symbolTableReaders.test.js',
  import.meta.url
).href;

// Each write line repeats, so each find takes the line before it too.
export const mutations = [
  {
    name: 'write the renamed reference as text, without its list',
    find: '            return undefined;\n          })\n        );\n        if (buffer.text() !== decl.value) table.write(decl, buffer.tokens());',
    replace:
      '            return undefined;\n          })\n        );\n        if (buffer.text() !== decl.value) table.setText(decl, buffer.text());',
  },
  {
    name: 'write the normalized template as text, without its list',
    find: '              : undefined;\n          })\n        );\n        if (buffer.text() !== decl.value) table.write(decl, buffer.tokens());',
    replace:
      '              : undefined;\n          })\n        );\n        if (buffer.text() !== decl.value) table.setText(decl, buffer.text());',
  },
];
