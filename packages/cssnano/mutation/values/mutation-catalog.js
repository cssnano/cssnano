export const name = 'values-text-table';
export const target = new URL('../../src/values/textTable.js', import.meta.url)
  .href;
export const test = new URL(
  '../../test/values/textTable.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'drop the stored-text equality check',
    find: 'if (entry !== undefined && entry.text === text) return entry.tokens;',
    replace: 'if (entry !== undefined) return entry.tokens;',
  },
  {
    name: 'store the list under the old selector text before the assignment',
    find: '    assign(rule, text);\n    this.#entries.set(rule, { text, tokens: list });\n  }\n\n  /**\n   * Assigns the text without storing tokens',
    replace:
      '    this.#entries.set(rule, { text: sourceSelector(rule), tokens: list });\n    assign(rule, text);\n  }\n\n  /**\n   * Assigns the text without storing tokens',
  },
];
