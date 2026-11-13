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
    name: 'write the renamed reference without its list',
    find: '          writeValue(records, context, index, buffer.tokens());\n        }\n      }\n\n      // Rename only live names; normalize dots and whitespace.',
    replace:
      '          writeValue(records, context, index, []);\n        }\n      }\n\n      // Rename only live names; normalize dots and whitespace.',
  },
  {
    name: 'write the normalized template without its list',
    find: '          writeValue(records, context, index, buffer.tokens());\n        }\n      }\n\n      defSites = [];',
    replace:
      '          writeValue(records, context, index, []);\n        }\n      }\n\n      defSites = [];',
  },
];
