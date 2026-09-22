export const name = 'postcss-discard-comments';
export const target = new URL('./src/index.js', import.meta.url).href;
export const test = new URL('./test/*.test.js', import.meta.url).href;

export const mutations = [
  {
    name: 'preserve removable comments in values',
    find: 'remover.canRemove(commentContents(raw))) {\n      pendingSpace = started;',
    replace: 'false) {\n      pendingSpace = started;',
  },
  {
    name: 'preserve removable comments in custom property values',
    find: 'remover.canRemove(commentContents(raw))\n      ) {\n        preserved += separator;',
    replace: 'false\n      ) {\n        preserved += separator;',
  },
  {
    name: 'preserve removable comments in selectors',
    find: 'remover.canRemove(commentContents(raw))) {\n        removedCommentBefore = true;',
    replace: 'false) {\n        removedCommentBefore = true;',
  },
  {
    name: 'fuse selector tokens across a removed comment',
    find: 'joinsIntoDifferentTokens(lastRaw, raw, parserCache)',
    replace: 'false',
  },
  {
    name: 'match math functions by raw spelling instead of the decoded name',
    find: 'calcSumArgumentFunctions.has(\n        asciiLowerCase(decoded(token))\n      )',
    replace:
      'calcSumArgumentFunctions.has(token[1].slice(0, -1).toLowerCase())',
  },
  {
    name: 'let bare parentheses own a math depth increment',
    find: '      // A bare parenthesis inherits the math context but owns no depth\n      // increment.\n      stack.push(false);',
    replace:
      '      // A bare parenthesis inherits the math context but owns no depth\n      // increment.\n      stack.push(depth > 0);',
  },
  {
    name: 'skip math operator spacing in calc-sum arguments',
    find: 'inMathFunction[index] &&\n      type === TokenType.Delim &&',
    replace: 'false &&\n      type === TokenType.Delim &&',
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
