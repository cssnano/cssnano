// Helpers shared by the merge-ir lint rules: the repository path of a file,
// the `file` or `file#name` entries of an allow list, and the function that
// encloses a node.

import { relative, sep } from 'node:path';

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

export const ARENA_EDITS = new Set([
  'appendEntry',
  'insertEntryBefore',
  'moveLast',
  'moveBefore',
  'detach',
]);

/** @param {any} context */
export function repoPath(context) {
  const file = context.physicalFilename ?? context.filename;
  return relative(context.cwd ?? process.cwd(), file)
    .split(sep)
    .join('/');
}

/**
 * Whether an allow list names the file, or the name in it. An entry `file`
 * allows every name of that file.
 *
 * @param {string[]} entries
 * @param {string} file
 * @param {string | null} name
 */
export function isAllowed(entries, file, name) {
  return entries.some((entry) => {
    const at = entry.indexOf('#');
    if (at === -1) return entry === file;
    return entry.slice(0, at) === file && entry.slice(at + 1) === name;
  });
}

/**
 * The nearest function around a node, with the name a reader gives it.
 *
 * @param {any[]} ancestors the ancestors of the node, outermost first
 * @returns {{ node: any, name: string | null } | null}
 */
export function nearestFunction(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const node = ancestors[i];
    if (FUNCTION_TYPES.has(node.type)) {
      return { node, name: functionName(node, ancestors[i - 1]) };
    }
  }
  return null;
}

/**
 * @param {any} fn
 * @param {any} parent
 */
function functionName(fn, parent) {
  if (fn.id) return fn.id.name;
  if (
    parent?.type === 'MethodDefinition' ||
    parent?.type === 'PropertyDefinition' ||
    parent?.type === 'Property'
  ) {
    return parent.key.name ?? null;
  }
  if (parent?.type === 'VariableDeclarator') return parent.id.name;
  return null;
}
