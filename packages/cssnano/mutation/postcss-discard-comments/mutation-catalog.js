export const name = 'postcss-discard-comments';
export const target = new URL(
  '../../src/plugins/postcss-discard-comments/index.js',
  import.meta.url
).href;
export const test = new URL(
  '../../test/postcss-discard-comments/*.test.js',
  import.meta.url
).href;

const replaceComments = new URL(
  '../../src/plugins/postcss-discard-comments/lib/replaceComments.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'preserve removable comments in values',
    target: replaceComments,
    find: 'remover.canRemove(commentContents(raw))) {\n      pendingSpace = started;',
    replace: 'false) {\n      pendingSpace = started;',
  },
  {
    name: 'preserve removable comments in custom property values',
    target: replaceComments,
    find: 'remover.canRemove(commentContents(raw))\n      ) {\n        preserved += separator;',
    replace: 'false\n      ) {\n        preserved += separator;',
  },
  {
    name: 'preserve removable comments in selectors',
    target: replaceComments,
    find: 'remover.canRemove(commentContents(raw))) {\n        removedCommentBefore = true;',
    replace: 'false) {\n        removedCommentBefore = true;',
  },
  {
    name: 'fuse selector tokens across a removed comment',
    target: replaceComments,
    find: 'joinsIntoDifferentTokens(lastRaw, raw, parserCache)',
    replace: 'false',
  },
  {
    name: 'match math functions by raw spelling instead of the decoded name',
    target: replaceComments,
    find: 'calcSumArgumentFunctions.has(\n      asciiLowerCase(decoded(token))\n    )',
    replace:
      'calcSumArgumentFunctions.has(token[1].slice(0, -1).toLowerCase())',
  },
  {
    name: 'let bare parentheses own a math depth increment',
    target: replaceComments,
    find: '    parens.push(false);\n  } else if',
    replace: '    parens.push(true);\n  } else if',
  },
  {
    name: 'skip math operator spacing in calc-sum arguments',
    target: replaceComments,
    find: 'mathDepth > 0 && type === TokenType.Delim',
    replace: 'false && type === TokenType.Delim',
  },
  {
    name: 'preserve removable comment nodes',
    find: "if (node.type === 'comment' && remover.canRemove(node.text)) {",
    replace: "if (node.type === 'comment' && false) {",
  },
  {
    name: 'skip declaration comment processing',
    find: 'processDeclaration(node, remover, parserCache);',
    replace: 'void node;',
  },
  {
    name: 'skip selector comment processing',
    find: 'processRule(node, remover, parserCache);',
    replace: 'void node;',
  },
  {
    name: 'skip at-rule comment processing',
    find: 'processAtRule(node, remover, parserCache);',
    replace: 'void node;',
  },
];
