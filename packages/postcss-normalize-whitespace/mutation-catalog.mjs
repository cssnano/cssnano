export const name = 'postcss-normalize-whitespace';
export const target = new URL('./src/index.js', import.meta.url).href;
export const test = new URL('./test/index.js', import.meta.url).href;

export const mutations = [
  {
    name: 'preserve declaration whitespace',
    find: "node.raws.before = node.raws.before.replace(whitespaceRegex, '');",
    replace: 'node.raws.before = node.raws.before;',
  },
  {
    name: 'trim custom properties',
    find: "if (type === decl && !node.prop.startsWith('--'))",
    replace: "if (type === decl && node.prop.startsWith('--'))",
  },
  {
    name: 'skip declaration trimming',
    find: 'trimDeclaration(node, declarationCache);',
    replace: 'void node;',
  },
  {
    name: 'preserve spaces around dividers',
    find: '  const besideDivider =\n    !context?.calc && (isDivider(previous) || isDivider(next));',
    replace: '  const besideDivider = false;',
  },
  {
    name: 'change the declaration separator',
    find: "node.raws.between = ':';",
    replace: "node.raws.between = '=';",
  },
  {
    name: 'drop trailing escape repair',
    find: 'last.value += node.raws.after[0];',
    replace: 'void last.value;',
  },
];
