export const name = 'postcss-discard-comments';
export const target = new URL('./src/index.js', import.meta.url).href;
export const test = new URL('./test/index.js', import.meta.url).href;

export const mutations = [
  {
    name: 'preserve removable comments in values',
    find: 'const contents = source.slice(start, end);\n\n      if (remover.canRemove(contents)) {',
    replace: 'const contents = source.slice(start, end);\n\n      if (false) {',
  },
  {
    name: 'preserve removable comments in selectors',
    find: 'if (remover.canRemove(contents)) {\n            node.remove();',
    replace: 'if (false) {\n            node.remove();',
  },
  {
    name: 'preserve removable comment nodes',
    find: "if (node.type === 'comment' && remover.canRemove(node.text)) {",
    replace: "if (node.type === 'comment' && false) {",
  },
  {
    name: 'skip declaration comment processing',
    find: 'processDeclaration(node, space);',
    replace: 'void node;',
  },
  {
    name: 'skip selector comment processing',
    find: 'processRule(node, space);',
    replace: 'void node;',
  },
  {
    name: 'skip at-rule comment processing',
    find: 'processAtRule(node, space);',
    replace: 'void node;',
  },
];
