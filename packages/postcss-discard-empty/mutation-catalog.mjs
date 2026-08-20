export const target = new URL('./src/index.js', import.meta.url).href;

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
