export const name = 'values-value-buffer';
export const target = new URL(
  '../../src/values/valueBuffer.js',
  import.meta.url
).href;
export const test = new URL(
  '../../test/values/valueBuffer.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'edit the shared list instead of a copy',
    find: '? this.#shared.slice()',
    replace: '? this.#shared',
  },
];
