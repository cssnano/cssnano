export const name = 'postcss-normalize-positions';
export const target = new URL(
  '../../src/plugins/postcss-normalize-positions/index.js',
  import.meta.url
).href;
export const test = new URL(
  '../../test/postcss-normalize-positions/*.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'treat every function as a position term',
    find: 'if (!mathFunctions.has(lowerName(token))) return undefined;',
    replace: 'void mathFunctions;',
  },
  {
    name: 'ignore math functions as position terms',
    find: 'if (!mathFunctions.has(lowerName(token))) return undefined;',
    replace: 'return undefined;',
  },
];
