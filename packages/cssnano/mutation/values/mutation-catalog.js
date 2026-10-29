export const name = 'values-text-table';
export const target = new URL('../../src/values/textTable.js', import.meta.url)
  .href;
export const test = new URL(
  '../../test/values/textTable.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'assign a folded text with tokens as a string, dropping its list',
    find: '    else this.share(node, folded);',
    replace: '    else assign(node, folded.text);',
  },
  {
    name: 'drop the stored-text equality check',
    find: 'if (entry !== undefined && entry.text === text) return entry.tokens;',
    replace: 'if (entry !== undefined) return entry.tokens;',
  },
  {
    name: 'store the list under the old selector text before the assignment',
    find: '    assign(node, text);\n    this.#entries.set(node, { text, tokens: list });\n  }\n\n  /**\n   * Assigns the text without storing tokens',
    replace:
      '    this.#entries.set(node, { text: sourceOf(node), tokens: list });\n    assign(node, text);\n  }\n\n  /**\n   * Assigns the text without storing tokens',
  },
];
