// Rules that a port of the merge window can read from syntax: a record that
// extends another (port rule 2) and a consistency check that writes (rule 8).

import {
  ARENA_EDITS,
  isAllowed,
  nearestFunction,
  repoPath,
} from './allowList.js';

const LIST_OPTIONS = [
  {
    type: 'object',
    properties: {
      allowed: { type: 'array', items: { type: 'string' } },
      modules: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
  },
];

const noRecordExtends = {
  meta: { type: 'problem', schema: LIST_OPTIONS },
  create(context) {
    const { allowed = [] } = context.options[0] ?? {};
    const file = repoPath(context);
    /** @param {any} node */
    const check = (node) => {
      if (!node.superClass) return;
      if (isAllowed(allowed, file, node.id?.name ?? null)) return;
      context.report({ node, message: 'a record class extends another' });
    };
    return { ClassDeclaration: check, ClassExpression: check };
  },
};

/** @param {any} expr */
function rootIdentifier(expr) {
  let node = expr;
  while (node.type === 'MemberExpression') node = node.object;
  return node.type === 'Identifier' ? node : null;
}

/**
 * @param {any[]} ancestors
 * @param {any} target
 */
const writesParameter = (ancestors, target) => {
  const root = rootIdentifier(target);
  const fn = nearestFunction(ancestors);
  return (
    root !== null &&
    target.type === 'MemberExpression' &&
    fn !== null &&
    fn.node.params.some(
      (param) => param.type === 'Identifier' && param.name === root.name
    )
  );
};

const checksOnlyRead = {
  meta: { type: 'problem', schema: LIST_OPTIONS },
  create(context) {
    const { allowed = [], modules = [] } = context.options[0] ?? {};
    const file = repoPath(context);
    const wholeModule = modules.includes(file);

    /**
     * Whether the code at this position is a check: the whole of a check
     * module, or an assert function.
     *
     * @param {any[]} ancestors
     */
    const isCheck = (ancestors) => {
      const fn = nearestFunction(ancestors);
      if (fn && isAllowed(allowed, file, fn.name)) return false;
      if (wholeModule) return true;
      return fn?.name?.startsWith('assert') ?? false;
    };

    return {
      AssignmentExpression(node) {
        const ancestors = context.sourceCode.getAncestors(node);
        if (!isCheck(ancestors) || !writesParameter(ancestors, node.left))
          return;
        context.report({
          node,
          message: 'a check assigns to a member of a parameter',
        });
      },
      UpdateExpression(node) {
        const ancestors = context.sourceCode.getAncestors(node);
        if (!isCheck(ancestors) || !writesParameter(ancestors, node.argument))
          return;
        context.report({
          node,
          message: 'a check assigns to a member of a parameter',
        });
      },
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== 'MemberExpression' ||
          callee.computed ||
          !ARENA_EDITS.has(callee.property.name) ||
          !isCheck(context.sourceCode.getAncestors(node))
        ) {
          return;
        }
        context.report({ node, message: 'a check calls an arena edit' });
      },
    };
  },
};

export default {
  'no-record-extends': noRecordExtends,
  'checks-only-read': checksOnlyRead,
};
