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
    find: "    declaresLayer = atRule.name.toLowerCase() === 'layer';",
    replace: '    declaresLayer = false;',
  },
  {
    name: 'treat a layer statement as not declaring a layer',
    find: "    node.name.toLowerCase() === 'layer'\n  );",
    replace: '    false\n  );',
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
    name: 'ignore the at-rule params in its structural id',
    find: '  path = step(path, node.params);',
    replace: '',
  },
  {
    name: 'ignore raws.before in the structural id of an at-rule',
    find: '  path = step(path, trimValue(node.raws.before));',
    replace: '',
  },
  {
    name: 'ignore raws.afterName in the structural id of an at-rule',
    find: '  return step(path, trimValue(node.raws.afterName));',
    replace: '  return path;',
  },
  {
    name: 'compare the at-rule raws untrimmed',
    find: '  return value ? value.trim() : value;',
    replace: '  return value;',
  },
  {
    name: 'let an important comment id not step its text',
    find: '  if (isImportantComment(node.text)) trie = step(trie, node.text);',
    replace: '',
  },
];
