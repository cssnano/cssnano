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
  '../../src/pipeline/comments/replaceComments.js',
  import.meta.url
).href;

const walk = new URL('../../src/pipeline/traversal.js', import.meta.url).href;

const nodeComments = new URL(
  '../../src/pipeline/comments/nodeComments.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'preserve removable comments in values',
    target: replaceComments,
    find: 'canRemove(commentContents(raw))) {\n      pendingSpace = started;',
    replace: 'false) {\n      pendingSpace = started;',
  },
  {
    name: 'preserve removable comments in custom property values',
    target: replaceComments,
    find: 'canRemove(commentContents(raw))) {\n        preserved += separator;',
    replace: 'false) {\n        preserved += separator;',
  },
  {
    name: 'preserve removable comments in selectors',
    target: replaceComments,
    find: 'canRemove(commentContents(raw))) {\n        removedCommentBefore = true;',
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
    target: walk,
    find: 'if (state.comments?.canRemove(node.text)) node.remove();',
    replace:
      'if (state.comments?.canRemove(node.text) && false) node.remove();',
  },
  {
    name: 'skip declaration comment processing',
    target: walk,
    find: "text = commentFreeText(read, comments, decl.prop.startsWith('--'));",
    replace: 'text = read;',
  },
  {
    name: 'skip selector comment processing',
    target: walk,
    find: 'removeSelectorComments(rule, state.comments);',
    replace: 'void rule;',
  },
  {
    name: 'skip at-rule comment processing',
    target: walk,
    find: 'comments !== null && read ? commentFreeText(read, comments) : read;',
    replace: 'read;',
  },
  {
    name: 'skip important comment processing',
    target: nodeComments,
    find: "if (!important || !important.includes('/*')) return;",
    replace: 'return;',
  },
];
