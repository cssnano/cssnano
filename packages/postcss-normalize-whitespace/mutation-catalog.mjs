export const name = 'postcss-normalize-whitespace';
export const target = new URL('./src/index.js', import.meta.url).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL('./test/*.test.js', import.meta.url).href;

export const mutations = [
  {
    name: 'preserve declaration whitespace',
    find: "node.raws.before = node.raws.before.replace(whitespaceRegex, '');",
    replace: 'node.raws.before = node.raws.before;',
  },
  {
    name: 'trim custom properties as standard declarations',
    find: "if (!node.prop.startsWith('--')) {",
    replace: "if (node.prop.startsWith('--')) {",
  },
  {
    name: 'skip declaration trimming',
    find: 'trimDeclaration(node, declarationCache);',
    replace: 'void node;',
  },
  {
    name: 'preserve spaces around dividers',
    find: '  const besideSlash = !context?.math && (isSlash(previous) || isSlash(next));',
    replace: '  const besideSlash = false;',
  },
  {
    name: 'drop preserved comments from the declaration separator',
    find: `  node.raws.between = trimSeparator(node.raws.between || ':');
  node.raws.semicolon = false;
}`,
    replace: `  node.raws.between = ':';
  node.raws.semicolon = false;
}`,
  },
  {
    name: 'keep custom property separator whitespace',
    find: `            node.raws.between = trimCustomPropertySeparator(
              node.raws.between || ':'
            );`,
    replace: `            node.raws.between = node.raws.between;`,
  },
  {
    name: 'drop trailing escape repair',
    find: 'last.value += node.raws.after[0];',
    replace: 'void last.value;',
  },
];
