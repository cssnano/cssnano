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
    name: 'drop arbitrary coordinate preservation fallback',
    find: "firstOutput ||\n      (first === 'center'\n        ? center\n        : value.slice(firstToken[2], secondToken[2]).trimEnd())",
    replace: 'outA',
  },
  {
    name: 'disable nested math-token handling',
    find: 'isNumber(token) ||\n    isMathFunction(token)',
    replace: 'isNumber(token) ||\n        false',
  },
];
