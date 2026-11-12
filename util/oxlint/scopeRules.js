// Rules over the bindings of a module, resolved through the scope manager:
// module-level state (port rule 7) and closures that capture state a loop
// changes (port rule 4).

import { isAllowed, repoPath } from './allowList.js';

const MUTATORS = new Set([
  'add',
  'clear',
  'copyWithin',
  'delete',
  'fill',
  'pop',
  'push',
  'reverse',
  'set',
  'shift',
  'sort',
  'splice',
  'unshift',
]);
const TABLE_CONSTRUCTORS = new Set(['Map', 'Set', 'WeakMap', 'WeakSet']);
const LOOP_TYPES = new Set([
  'DoWhileStatement',
  'ForInStatement',
  'ForOfStatement',
  'ForStatement',
  'WhileStatement',
]);
const FUNCTION_TYPES = new Set([
  'ArrowFunctionExpression',
  'FunctionDeclaration',
  'FunctionExpression',
]);
const LIST_OPTIONS = [
  {
    type: 'object',
    properties: { allowed: { type: 'array', items: { type: 'string' } } },
    additionalProperties: false,
  },
];

/** @param {any} scope every scope under and including this one */
function* allScopes(scope) {
  yield scope;
  for (const child of scope.childScopes) yield* allScopes(child);
}

/**
 * The function scope that owns a scope, or null at module level.
 *
 * @param {any} scope
 */
function ownerFunction(scope) {
  let owner = scope;
  while (owner && owner.type !== 'function') owner = owner.upper;
  return owner ?? null;
}

/**
 * Whether a node sits inside a loop of its own function.
 *
 * @param {any[]} ancestors outermost first
 */
function inLoop(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (FUNCTION_TYPES.has(ancestors[i].type)) return false;
    if (LOOP_TYPES.has(ancestors[i].type)) return true;
  }
  return false;
}

/**
 * Whether an identifier is the object of a mutation: a member assignment, an
 * update, a delete, or a call of a mutating method.
 *
 * @param {any[]} ancestors the ancestors of the identifier
 */
function isMutation(ancestors) {
  const parent = ancestors.at(-1);
  const grand = ancestors.at(-2);
  if (parent?.type !== 'MemberExpression') return false;
  if (grand?.type === 'AssignmentExpression' && grand.left === parent) {
    return true;
  }
  if (grand?.type === 'UpdateExpression') return true;
  if (grand?.type === 'UnaryExpression' && grand.operator === 'delete') {
    return true;
  }
  return (
    grand?.type === 'CallExpression' &&
    grand.callee === parent &&
    !parent.computed &&
    MUTATORS.has(parent.property.name)
  );
}

/** @param {any} init */
function holdsTable(init) {
  if (!init) return false;
  if (init.type === 'ArrayExpression' || init.type === 'ObjectExpression') {
    return true;
  }
  return (
    init.type === 'NewExpression' &&
    init.callee.type === 'Identifier' &&
    TABLE_CONSTRUCTORS.has(init.callee.name)
  );
}

const noModuleState = {
  meta: { type: 'problem', schema: LIST_OPTIONS },
  create(context) {
    const { allowed = [] } = context.options[0] ?? {};
    const file = repoPath(context);
    return {
      'Program:exit'(program) {
        const globalScope = context.sourceCode.getScope(program);
        const moduleScope = globalScope.childScopes.find(
          (scope) => scope.type === 'module'
        );
        const mutated = new Set();
        for (const scope of allScopes(globalScope)) {
          for (const ref of scope.references) {
            const variable = ref.resolved;
            if (
              variable?.scope.type !== 'module' ||
              ownerFunction(ref.from) === null
            ) {
              continue;
            }
            if (isMutation(context.sourceCode.getAncestors(ref.identifier))) {
              mutated.add(variable);
            }
          }
        }
        for (const variable of moduleScope?.variables ?? []) {
          const def = variable.defs[0];
          if (
            def?.type !== 'Variable' ||
            isAllowed(allowed, file, variable.name)
          ) {
            continue;
          }
          const kind = def.parent.kind;
          if (kind !== 'const') {
            context.report({
              node: def.name,
              message:
                'a module-level let or var holds state that a run changes',
            });
          } else if (holdsTable(def.node.init) && mutated.has(variable)) {
            context.report({
              node: def.name,
              message: 'a module-level table that a function body mutates',
            });
          }
        }
      },
    };
  },
};

const noCapturedLoopState = {
  meta: { type: 'problem', schema: LIST_OPTIONS },
  create(context) {
    const { allowed = [] } = context.options[0] ?? {};
    const file = repoPath(context);
    return {
      'Program:exit'(program) {
        const scopes = [...allScopes(context.sourceCode.getScope(program))];
        const loopWritten = new Set();
        const refs = scopes.flatMap((scope) => scope.references);
        for (const ref of refs) {
          const variable = ref.resolved;
          const owner = variable && ownerFunction(variable.scope);
          if (!owner || ref.init || !ref.isWrite()) continue;
          const writer = ownerFunction(ref.from);
          if (
            writer === owner &&
            inLoop(context.sourceCode.getAncestors(ref.identifier))
          ) {
            loopWritten.add(variable);
          }
        }
        for (const ref of refs) {
          const variable = ref.resolved;
          const owner = variable && ownerFunction(variable.scope);
          if (!owner) continue;
          const writer = ownerFunction(ref.from);
          if (writer === owner || isAllowed(allowed, file, variable.name)) {
            continue;
          }
          if (ref.isWrite() && !ref.init) {
            context.report({
              node: ref.identifier,
              message:
                'a closure assigns to a binding of an enclosing function',
            });
          } else if (
            ref.isRead() &&
            loopWritten.has(variable) &&
            isLet(variable)
          ) {
            context.report({
              node: ref.identifier,
              message:
                'a closure reads a let that its function reassigns inside a loop',
            });
          }
        }
      },
    };
  },
};

/** @param {any} variable */
function isLet(variable) {
  return variable.defs[0]?.parent?.kind === 'let';
}

export default { noModuleState, noCapturedLoopState };
