export const name = 'merge-moves';

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

export const target = source('blockRecords.js');
// Only the move tests judge these: they run under checks, where a move that
// leaves its entry linked throws. Unchecked, the moves of a block's children
// would loop forever on the chain the fault leaves, and time the run out.
export const test = new URL(
  '../../../../../test/passes/merge/lib/rules/arenaMoves.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'a move to the end that leaves the moved entry in its old chain',
    target: source('blockRecords.js'),
    find: '    this.detach(index);\n    this.#linkLast(container, index);\n',
    replace: '    this.#linkLast(container, index);\n',
  },
];
