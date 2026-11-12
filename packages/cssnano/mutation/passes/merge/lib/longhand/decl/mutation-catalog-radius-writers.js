export const name = 'merge-longhand: declaration commit writes';
export const target = new URL(
  '../../../../../../src/passes/merge/lib/longhand/nodeDeclarations.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../../../../../test/pipeline/textTableWriters.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'assign a rewritten declaration as a string, dropping its tokens',
    find: '  node.prop = item.prop;\n  delete node.raws.value;\n  textTable.record(node, item.value, item.tokens);',
    replace:
      '  node.prop = item.prop;\n  delete node.raws.value;\n  textTable.setText(node, item.value);',
  },
  {
    name: 'assign a cloned declaration as a string, dropping its tokens',
    find: '  delete node.raws.value;\n  textTable.record(node, item.value, item.tokens);\n  if (item.inheritedSupport',
    replace:
      '  delete node.raws.value;\n  textTable.setText(node, item.value);\n  if (item.inheritedSupport',
  },
];
