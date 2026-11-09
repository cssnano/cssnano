// Lint rules for the arena invariants of the merge pass. Each rule reads two
// lists from its options. `allowed` names the files, or the functions of a
// file, where its pattern may appear. `required` names the sites that must
// exist. An entry is `file` or `file#function`, with the path relative to the
// working directory.

import { relative, sep } from 'node:path';
import noPostcssInWindow from './noPostcssInWindow.js';

const LINK_METHODS = new Set(['linkBefore', 'linkLast', 'unlink']);
const CACHE_READS = new Set(['keysOf', 'receivingOf']);

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

const ARENA_EDITS = new Set([
  'appendEntry',
  'insertEntryBefore',
  'moveLast',
  'moveBefore',
  'detach',
]);

const arenaEditsOnly = {
  meta: { type: 'problem', schema: LIST_OPTIONS },
  create(context) {
    const { allowed = [] } = context.options[0] ?? {};
    const file = repoPath(context);
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== 'MemberExpression' ||
          callee.computed ||
          !ARENA_EDITS.has(callee.property.name) ||
          allowed.some((entry) => entryHits(entry, file, null))
        ) {
          return;
        }
        context.report({
          node,
          message: 'an arena edit outside the edit modules',
        });
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

export default {
  meta: { name: 'merge-ir' },
  rules: {
    'link-edits-through-arena': linkEdits,
    'cache-reads': cacheReads,
    'no-cache-local': noCacheLocal,
    'no-postcss-in-window': noPostcssInWindow,
    'arena-edits-only': arenaEditsOnly,
  },
};
