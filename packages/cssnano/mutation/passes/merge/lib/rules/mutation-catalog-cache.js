export const name = 'merge-cache';

/**
 * @param {string} module
 * @return {string}
 */
function irSource(module) {
  return new URL(`../../../../../src/passes/ir/${module}`, import.meta.url)
    .href;
}

export const target = irSource('declarationCache.js');
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../../../../test/passes/{merge/lib/rules,ir}/*.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'a link stamps no container',
    target: irSource('blockRecords.js'),
    find: '    this.#links.linkBefore(sibling, index);\n    this.#touchDeclaration(block, index);\n',
    replace: '    this.#links.linkBefore(sibling, index);\n',
  },
  {
    name: 'an append stamps no container',
    target: irSource('blockRecords.js'),
    find: '    this.#links.linkLast(block, index);\n    this.#touchDeclaration(block, index);\n',
    replace: '    this.#links.linkLast(block, index);\n',
  },
  {
    name: 'a read treats a stale entry as fresh',
    target: irSource('declarationCache.js'),
    find: '    if (this.#builtAt[index] !== stamp) {',
    replace: '    if (this.#builtAt[index] === -1) {',
  },
  {
    name: 'a rebuild leaves the build stamp',
    target: irSource('declarationCache.js'),
    find: '      this.#builtAt[index] = stamp;\n',
    replace: '',
  },
  {
    name: 'the append extends a stale entry',
    target: irSource('declarationCache.js'),
    find: '    if (this.#builtAt[index] !== before) return;\n',
    replace: '',
  },
  {
    name: 'a link before the last child appends in place',
    target: irSource('blockRecords.js'),
    find: '    if (this.#links.nextSibling(/** @type {ArenaIndex} */ (index)) !== -1) {\n      return;\n    }\n',
    replace: '',
  },
  {
    name: 'the append leaves `kept`',
    target: irSource('declarationCache.js'),
    find: '    /** @type {ArenaIndex[]} */ (entry.kept).push(\n      /** @type {ArenaIndex} */ (declaration.index)\n    );\n',
    replace: '',
  },
  {
    name: 'the append leaves the writes',
    target: irSource('declarationCache.js'),
    find: '    if (entry.writes)\n      entry.writes.record(declaration.keys, entry.kept.length - 1);\n',
    replace: '',
  },
  {
    name: 'a rebuild keeps the writes',
    target: irSource('declarationCache.js'),
    find: '      this.#entries[index] = { kept, keySet, writes: undefined };\n',
    replace:
      '      this.#entries[index] = { kept, keySet, writes: this.#entries[index]?.writes };\n',
  },
  {
    name: 'a fresh read leaves the writes undefined',
    target: irSource('declarationCache.js'),
    find: '      entry.writes = writesOfKept(records, entry.kept);\n',
    replace: '      writesOfKept(records, entry.kept);\n',
  },
  {
    name: 'a detach that leaves the stamp of the container it leaves',
    target: irSource('blockRecords.js'),
    find: '    this.#links.unlink(index);\n    this.#touchDeclaration(block, index);\n',
    replace: '    this.#links.unlink(index);\n',
  },
];
