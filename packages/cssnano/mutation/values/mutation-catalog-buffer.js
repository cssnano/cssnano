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
    name: 'write the edit into the list tokens() returned earlier',
    find: '    renumber(next);\n    this.#tokens = next;',
    replace:
      '    renumber(next);\n    for (let index = 0; index < next.length; index++) own[index] = next[index];\n    this.#tokens = own;',
  },
];
