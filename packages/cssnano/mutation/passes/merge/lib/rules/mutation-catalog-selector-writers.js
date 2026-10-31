export const name = 'merge-selector-writers';

/**
 * @param {string} module
 * @return {string}
 */
function source(module) {
  return new URL(
    `../../../../../src/passes/merge/lib/rules/${module}`,
    import.meta.url
  ).href;
}

export const target = source('mergeState.js');
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../../../../test/passes/merge/selectorWriters.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'store the joined selector list as text, dropping its tokens',
    find: '        this.#textTable.write(record.node, list);',
    replace: '        this.#textTable.setText(record.node, tokensText(list));',
  },
  {
    name: 'store a clone or joined rule as text, dropping its tokens',
    find: '      this.#textTable.record(rule, rule.selector, list);',
    replace: '      this.#textTable.setText(rule, rule.selector);',
  },
  {
    name: 'forget the rules a merge spelled, so their tokens are never stored',
    find: '    this.#spelled.add(record);',
    replace: '    void record;',
  },
  {
    name: 'drop the token ranges a clone keeps, so its element keys tokenize',
    find: '    this.#storePieces(clone, this.piecesOf(record), separatorOf(source));',
    replace: '    this.#storePieces(clone, null, separatorOf(source));',
  },
  {
    name: 'drop the token ranges of the selectors a rule gains by repeated declarations',
    find: '    const from = own === null ? null : this.piecesOf(source);',
    replace: '    const from = null;',
  },
];
