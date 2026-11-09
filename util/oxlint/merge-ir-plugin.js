// Lint rules for the arena invariants of the merge pass. Each rule reads two
// lists from its options. `allowed` names the files, or the functions of a
// file, where its pattern may appear. `required` names the sites that must
// exist. An entry is `file` or `file#function`, with the path relative to the
// working directory.

import { relative, sep } from 'node:path';
import noPostcssInWindow from './noPostcssInWindow.js';

const LINK_METHODS = new Set(['linkAfter', 'linkLast', 'unlink', 'takeLinkOf']);
const CACHE_READS = new Set(['keysOf', 'receivingOf']);
const CHECK = 'consistencyChecksEnabled';

const LIST_OPTIONS = [
  {
    type: 'object',
    properties: {
      allowed: { type: 'array', items: { type: 'string' } },
      required: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
  },
];

/** @param {any} context */
function repoPath(context) {
  const file = context.physicalFilename ?? context.filename;
  return relative(context.cwd ?? process.cwd(), file)
    .split(sep)
    .join('/');
}

/** @param {string} entry */
function parseEntry(entry) {
  const at = entry.indexOf('#');
  return at === -1
    ? { file: entry, fn: null }
    : { file: entry.slice(0, at), fn: entry.slice(at + 1) };
}

/**
 * Whether an entry names the file and, when it has one, the function.
 *
 * @param {string} entry
 * @param {string} file
 * @param {string | null} fn
 */
function entryHits(entry, file, fn) {
  const parsed = parseEntry(entry);
  return parsed.file === file && (parsed.fn === null || parsed.fn === fn);
}

/** @param {any} node */
function isNamed(node, name) {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    (node.property.type === 'Identifier' ||
      node.property.type === 'PrivateIdentifier') &&
    node.property.name === name
  );
}

/** @param {any} node */
function isCheckCall(node) {
  return (
    node?.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === CHECK
  );
}

/** The name of the nearest enclosing function that has one, or null. */
function enclosingName(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const fn = ancestors[i];
    if (
      fn.type !== 'FunctionDeclaration' &&
      fn.type !== 'FunctionExpression' &&
      fn.type !== 'ArrowFunctionExpression'
    ) {
      continue;
    }
    const parent = ancestors[i - 1];
    if (fn.id) return fn.id.name;
    if (
      parent?.type === 'MethodDefinition' ||
      parent?.type === 'PropertyDefinition' ||
      parent?.type === 'Property'
    ) {
      return parent.key.name;
    }
    if (parent?.type === 'VariableDeclarator') return parent.id.name;
  }
  return null;
}

/**
 * Reports each required entry of this file that no site satisfied. A site
 * satisfies `file#function` when it sits in that function, and `file` when
 * it sits anywhere in the file.
 *
 * @param {any} context
 * @param {string[]} required
 * @param {string} file
 * @param {Set<string | null>} sites
 */
function reportMissing(context, required, file, sites, program) {
  for (const entry of required) {
    const parsed = parseEntry(entry);
    if (parsed.file !== file) continue;
    const found = parsed.fn === null ? sites.size > 0 : sites.has(parsed.fn);
    if (!found) {
      context.report({
        node: program,
        message: `required site ${entry} is missing`,
      });
    }
  }
}

/** @param {any} expr */
function unwrap(expr) {
  return expr.type === 'ChainExpression' ? expr.expression : expr;
}

/**
 * A call of a method of the chain on a `links` object: the `links` of a
 * record, or `this.#links`.
 *
 * @param {any} expr
 */
function isLinksObject(expr) {
  if (expr.type === 'Identifier') return expr.name === 'links';
  return expr.type === 'MemberExpression' && isNamed(expr, 'links');
}

/** @param {any} expr */
function isThisLinks(expr) {
  return (
    expr.type === 'MemberExpression' &&
    expr.object.type === 'ThisExpression' &&
    expr.property.type === 'PrivateIdentifier' &&
    expr.property.name === 'links'
  );
}

/** @param {any} expr */
function isRecordsObject(expr) {
  if (expr.type === 'Identifier') return expr.name === 'records';
  return expr.type === 'MemberExpression' && isNamed(expr, 'records');
}

/**
 * The declaration cache of a rule: the `declarations` of a `records` object.
 *
 * @param {any} expr
 */
function isRecordsDeclarations(expr) {
  return isNamed(expr, 'declarations') && isRecordsObject(expr.object);
}

/** @param {any} expr */
function isDeclarationsObject(expr) {
  if (expr.type === 'Identifier') return expr.name === 'declarations';
  return isNamed(expr, 'declarations');
}

/**
 * The left-most operand of an `&&` chain.
 *
 * @param {any} expr
 */
function leftmostAnd(expr) {
  let at = expr;
  while (at.type === 'LogicalExpression' && at.operator === '&&') at = at.left;
  return at;
}

/** @param {any} statement */
function isEarlyReturnGuard(statement) {
  if (statement?.type !== 'IfStatement' || statement.alternate) return false;
  const test = statement.test;
  if (test.type !== 'UnaryExpression' || test.operator !== '!') return false;
  if (!isCheckCall(test.argument)) return false;
  const consequent = statement.consequent;
  const ret =
    consequent.type === 'BlockStatement' && consequent.body.length === 1
      ? consequent.body[0]
      : consequent;
  return ret.type === 'ReturnStatement' && ret.argument === null;
}

/**
 * Whether a read of `.departed` runs only under consistency checks: in the
 * consequent of an `if` whose test starts with the check call, in a later
 * operand of such an `&&` chain, or after a function's guard statement.
 *
 * @param {any} node
 * @param {any[]} ancestors
 */
function underChecks(node, ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const parent = ancestors[i];
    const child = i + 1 < ancestors.length ? ancestors[i + 1] : node;
    if (parent.type === 'IfStatement') {
      if (
        child === parent.consequent &&
        isCheckCall(leftmostAnd(parent.test))
      ) {
        return true;
      }
    } else if (
      parent.type === 'LogicalExpression' &&
      parent.operator === '&&' &&
      child === parent.right
    ) {
      if (isCheckCall(leftmostAnd(parent.left))) return true;
    } else if (
      parent.type === 'FunctionDeclaration' ||
      parent.type === 'FunctionExpression' ||
      parent.type === 'ArrowFunctionExpression'
    ) {
      const body = parent.body;
      if (body.type !== 'BlockStatement' || !isEarlyReturnGuard(body.body[0])) {
        continue;
      }
      const statement = i + 2 < ancestors.length ? ancestors[i + 2] : node;
      if (statement !== body.body[0]) return true;
    }
  }
  return false;
}

const linkEdits = {
  meta: { type: 'problem', schema: LIST_OPTIONS },
  create(context) {
    const { allowed = [], required = [] } = context.options[0] ?? {};
    const file = repoPath(context);
    /** @type {Set<string | null>} */
    const sites = new Set();
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== 'MemberExpression' ||
          callee.computed ||
          !LINK_METHODS.has(callee.property.name) ||
          !isLinksObject(callee.object)
        ) {
          return;
        }
        const fn = enclosingName(context.sourceCode.getAncestors(node));
        if (
          isThisLinks(callee.object) &&
          allowed.some((entry) => entryHits(entry, file, fn))
        ) {
          sites.add(fn);
          return;
        }
        context.report({
          node,
          message: 'a links edit outside the arena of blockRecords.js',
        });
      },
      'Program:exit'(program) {
        reportMissing(context, required, file, sites, program);
      },
    };
  },
};

const cacheReads = {
  meta: { type: 'problem', schema: LIST_OPTIONS },
  create(context) {
    const { allowed = [], required = [] } = context.options[0] ?? {};
    const file = repoPath(context);
    /** @type {Set<string | null>} */
    const sites = new Set();
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== 'MemberExpression' ||
          callee.computed ||
          !CACHE_READS.has(callee.property.name) ||
          !isDeclarationsObject(callee.object)
        ) {
          return;
        }
        const fn = enclosingName(context.sourceCode.getAncestors(node));
        if (allowed.some((entry) => entryHits(entry, file, fn))) {
          sites.add(fn);
          return;
        }
        context.report({
          node,
          message: 'a declaration cache read outside its reader functions',
        });
      },
      'Program:exit'(program) {
        reportMissing(context, required, file, sites, program);
      },
    };
  },
};

const noCacheLocal = {
  meta: { type: 'problem', schema: LIST_OPTIONS },
  create(context) {
    return {
      VariableDeclarator(node) {
        const init = node.init && unwrap(node.init);
        const holds =
          (init && isRecordsDeclarations(init)) ||
          (init &&
            isRecordsObject(init) &&
            node.id.type === 'ObjectPattern' &&
            node.id.properties.some(
              (property) =>
                property.key?.type === 'Identifier' &&
                property.key.name === 'declarations'
            ));
        if (holds) {
          context.report({
            node,
            message: 'a variable holds the declaration cache of a rule',
          });
        }
      },
      AssignmentExpression(node) {
        if (isRecordsDeclarations(unwrap(node.right))) {
          context.report({
            node,
            message: 'a variable holds the declaration cache of a rule',
          });
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.property.name === 'declarationKeys'
        ) {
          context.report({
            node,
            message: 'declarationKeys is a function, not a method',
          });
        }
      },
    };
  },
};

const departedUnderChecks = {
  meta: { type: 'problem', schema: LIST_OPTIONS },
  create(context) {
    const { required = [] } = context.options[0] ?? {};
    const file = repoPath(context);
    /** @type {Set<string | null>} */
    const sites = new Set();
    return {
      MemberExpression(node) {
        // A private field such as `this.#departed` is not the public read.
        if (node.computed || node.property.type !== 'Identifier') return;
        if (node.property.name !== 'departed') return;
        const ancestors = context.sourceCode.getAncestors(node);
        const parent = ancestors.at(-1);
        if (parent?.type === 'AssignmentExpression' && parent.left === node) {
          return;
        }
        if (underChecks(node, ancestors)) {
          sites.add(null);
          return;
        }
        context.report({
          node,
          message: 'departed read outside a consistency check',
        });
      },
      'Program:exit'(program) {
        reportMissing(context, required, file, sites, program);
      },
    };
  },
};

export default {
  meta: { name: 'merge-ir' },
  rules: {
    'link-edits-through-arena': linkEdits,
    'cache-reads': cacheReads,
    'no-cache-local': noCacheLocal,
    'departed-under-checks': departedUnderChecks,
    'no-postcss-in-window': noPostcssInWindow,
  },
};
