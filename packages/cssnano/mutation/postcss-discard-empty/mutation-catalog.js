export const name = 'postcss-discard-empty';
export const target = new URL(
  '../../src/plugins/postcss-discard-empty/index.js',
  import.meta.url
).href;
export const test = new URL(
  '../../test/postcss-discard-empty/index.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'change the plugin identifier',
    find: "const plugin = 'postcss-discard-empty';",
    replace: "const plugin = 'postcss-keep-empty';",
  },
  {
    name: 'classify removals as warnings',
    find: "type: 'removal',",
    replace: "type: 'warning',",
  },
  {
    name: 'stop removing discarded nodes',
    find: '      node.remove();',
    replace: '      void node;',
  },
  {
    name: 'invert empty declaration detection',
    find: "type === 'decl' && !node.value",
    replace: "type === 'decl' && node.value",
  },
  {
    name: 'discard empty custom properties',
    find: "!node.prop.startsWith('--')",
    replace: "node.prop.startsWith('--')",
  },
  {
    name: 'invert empty rule detection',
    find: "type === 'rule' && !node.selector",
    replace: "type === 'rule' && node.selector",
  },
  {
    name: 'invert empty container detection',
    find: '(sub && !sub.length && !isLayer)',
    replace: '(sub && sub.length && !isLayer)',
  },
  {
    name: 'invert empty at-rule detection',
    find: '((!sub && !node.params)',
    replace: '((!sub && node.params)',
  },
  {
    name: 'discard parameterized at-rules',
    find: '(!sub && !node.params)',
    replace: '(!sub && node.params)',
  },
  {
    name: 'invert empty at-rule container detection',
    find: "!(/** @type {import('postcss').ChildNode[]} */ (sub).length)",
    replace: "(/** @type {import('postcss').ChildNode[]} */ (sub).length)",
  },
  {
    name: 'invert repeated empty layer detection',
    find: 'name !== undefined && sub?.length === 0 && isDeclared(layerKey)',
    replace: 'name !== undefined && sub?.length === 0 && !isDeclared(layerKey)',
  },
  {
    name: 'drop non-empty layer bookkeeping',
    find: '      (scopes[scopes.length - 1] ??= new Set()).add(key);',
    replace: '      void key;',
  },
  {
    name: 'split escaped layer names',
    find: 'for (const segment of name.split(SEPARATOR)) {',
    replace: 'for (const segment of name.split(/[\\0.]/v)) {',
  },
  {
    name: 'drop nested layer path components',
    find: '      key = joinKey(key, segment);',
    replace: '      key = joinKey(parentKey, segment);',
  },
  {
    name: 'record removals at the front',
    find: 'result.messages.push({',
    replace: 'result.messages.unshift({',
  },
  {
    name: 'report the root instead of the removed node',
    find: '      reportRemoval(result, node);',
    replace: '      reportRemoval(result, css);',
  },
  {
    name: 'leave the ancestors a later removal empties',
    find: '    parent.remove();',
    replace: '    break;',
  },
  {
    name: 'stop after the first emptied ancestor',
    find: '    parent = next;',
    replace: '    parent = undefined;',
  },
  {
    name: 'treat an emptied named layer as removable',
    find: "      parent.type === 'atrule' && asciiLowerCase(parent.name) === 'layer',",
    replace: '      false,',
  },
];
