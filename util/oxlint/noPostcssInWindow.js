// Keeps postcss out of the merge window: the files that the rule merging and
// duplicate removing transforms run on, and the IR they read.

import { relative, sep } from 'node:path';

// A module specifier of postcss itself, or of one of its subpaths.
const POSTCSS_SPECIFIER = /^postcss(\/|$)/v;
// A JSDoc type that names postcss: an `@import` tag or an `import()` type.
const JSDOC_POSTCSS =
  /@import\b[^\n]*?\bfrom\s+['"]postcss(\/[^'"]*)?['"]|\bimport\(\s*['"]postcss(\/[^'"]*)?['"]\s*\)/v;
const MESSAGE = 'a merge window file reaches postcss';

/** @param {any} context */
function repoPath(context) {
  const file = context.physicalFilename ?? context.filename;
  return relative(context.cwd ?? process.cwd(), file)
    .split(sep)
    .join('/');
}

const noPostcssInWindow = {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: { allowed: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const { allowed = [] } = context.options[0] ?? {};
    if (allowed.includes(repoPath(context))) return {};
    return {
      ImportDeclaration(node) {
        if (POSTCSS_SPECIFIER.test(node.source.value)) {
          context.report({ node, message: MESSAGE });
        }
      },
      'Program:exit'() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (JSDOC_POSTCSS.test(comment.value)) {
            context.report({ node: comment, message: MESSAGE });
          }
        }
      },
    };
  },
};

export default noPostcssInWindow;
