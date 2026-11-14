export const name = 'postcss-merge-idents: reference rewrite writer';
export const target = new URL(
  '../../src/passes/ir/valueEdits.js',
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
    name: 'write the rewritten value as text, without its list',
    find: '      tokensText(list),\n      list\n    )',
    replace: '      tokensText(list),\n      undefined\n    )',
  },
];
