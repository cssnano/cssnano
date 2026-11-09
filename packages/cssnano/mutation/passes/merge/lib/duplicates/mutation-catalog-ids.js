export const name = 'merge-duplicate-ids';

export const target = new URL(
  '../../../../../src/passes/merge/lib/duplicates/structuralIds.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../../../../test/passes/merge/lib/duplicates/*.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'ignore the selector in the structural id of a rule',
    find: "      step(keys.root, 'rule'),\n      /** @type {RuleRecord} */ (container).selector\n    )",
    replace: "      step(keys.root, 'rule'),\n      ''\n    )",
  },
  {
    name: 'let a layer declaration not mark the block that holds it',
    find: '    declaresLayer ||= layered.has(id);',
    replace: '',
  },
  {
    name: 'treat a layer at-rule as not declaring a layer',
    find: '    declaresLayer = container.kind === LAYER;',
    replace: '    declaresLayer = false;',
  },
  {
    name: 'treat a layer statement as not declaring a layer',
    find: '  return markLayered(layered, entry.preludeId, entry.kind === LAYER);',
    replace: '  return markLayered(layered, entry.preludeId, false);',
  },
  {
    name: 'let an empty block equal a statement with the same prelude',
    find: '  path = step(path, BLOCK);',
    replace: '',
  },
  {
    name: 'ignore the children in the structural id of a container',
    find: '    path = step(path, id);',
    replace: '',
  },
  {
    name: 'ignore the at-rule params in its prelude id',
    target: new URL(
      '../../../../../src/passes/ir/declarationKey.js',
      import.meta.url
    ).href,
    find: '    path = step(path, node.params);',
    replace: '',
  },
  {
    name: 'ignore raws.before in the prelude id of an at-rule',
    target: new URL(
      '../../../../../src/passes/ir/declarationKey.js',
      import.meta.url
    ).href,
    find: '    path = step(path, trimValue(node.raws.before));',
    replace: '',
  },
  {
    name: 'ignore raws.afterName in the prelude id of an at-rule',
    target: new URL(
      '../../../../../src/passes/ir/declarationKey.js',
      import.meta.url
    ).href,
    find: '    path = step(path, trimValue(node.raws.afterName));',
    replace: '',
  },
  {
    name: 'compare the at-rule raws untrimmed',
    target: new URL(
      '../../../../../src/passes/ir/declarationKey.js',
      import.meta.url
    ).href,
    find: '  return value ? value.trim() : value;',
    replace: '  return value;',
  },
  {
    name: 'let an important comment id not step its text',
    find: '  if (isImportantComment(text)) trie = step(trie, text);',
    replace: '',
  },
];
