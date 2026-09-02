export const name = 'postcss-normalize-positions';
export const target = new URL('./src/index.js', import.meta.url).href;
export const test = new URL('./test/index.js', import.meta.url).href;

export const mutations = [
  {
    name: 'drop arbitrary coordinate preservation fallback',
    find: "outA ||\n          (first === 'center' ? center : value.slice(a[2], b[2]).trimEnd())",
    replace: 'outA',
  },
  {
    name: 'disable nested math-token handling',
    find: 'isNumber(token) ||\n        isMathFunction(token)',
    replace: 'isNumber(token) ||\n        false',
  },
];
