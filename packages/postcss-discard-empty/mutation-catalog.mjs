export const name = 'postcss-discard-empty';
export const target = new URL('./src/index.js', import.meta.url).href;
export const test = new URL('./test/index.js', import.meta.url).href;

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
    find: '(isEmptyLayer && nonEmptyLayers.has(layerKey))',
    replace: '(isEmptyLayer && !nonEmptyLayers.has(layerKey))',
  },
  {
    name: 'drop non-empty layer bookkeeping',
    find: '      nonEmptyLayers.add(layerKey);',
    replace: '      void layerKey;',
  },
  {
    name: 'split escaped layer names',
    find: "else if (character === '.' && !escaped)",
    replace: "else if (character === '.' && escaped)",
  },
  {
    name: 'drop nested layer path components',
    find: '[...layerPath, ...getLayerPath(layerName)]',
    replace: 'getLayerPath(layerName)',
  },
  {
    name: 'record removals at the front',
    find: 'result.messages.push({',
    replace: 'result.messages.unshift({',
  },
  {
    name: 'report the root instead of the removed node',
    find: '        node,\n      });',
    replace: '        node: css,\n      });',
  },
];
