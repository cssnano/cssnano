import cssnanoUtils from '#utils';
import { applyChildEdits, detach } from '../deferredChildEdits.js';
import { step } from '../../../ir/declarationKey.js';
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
import { createRunContext } from '../../../ir/runContext.js';

const { isAnonymousLayer, isImportantComment } = cssnanoUtils;

// Identical preludes apply their contents under the same condition; other
// at-rules have semantics this plugin does not model.
const conditionalAtRules = new Set(['media', 'supports', 'container']);

/**
 * @typedef {{
 *   declarations: DeclarationKeys,
 *   ids: WeakMap<import('postcss').AnyNode, number>,
 *   layered: Set<number>,
 * }} Interner
 */

/**
 * Declarations already kept in a container, shared by every sibling at-rule
 * whose conditions are identical.
 * @typedef {{
 *   decls?: Map<number, import('postcss').AnyNode>,
 *   ruleDecls?: Map<string, Map<number, import('postcss').AnyNode>>,
 *   children?: Map<string, Scope>,
 * }} Scope
 */

/**
 * @param {DeclarationKeys} declarations
 * @return {Interner}
 */
function createInterner(declarations) {
  return { declarations, ids: new WeakMap(), layered: new Set() };
}

/**
 * @param {string | undefined} value
 * @return {string | undefined}
 */
function trimValue(value) {
  return value ? value.trim() : value;
}

/**
 * Structural id of a node, computed bottom-up from its children. Equal ids
 * mean equal nodes. Comments all share one id, whatever their text.
 * @param {Interner} interner
 * @param {import('postcss').AnyNode} node
 * @return {number}
 */
function nodeId(interner, node) {
  let id = interner.ids.get(node);
  if (id === undefined) {
    id = computeNodeId(interner, node);
    interner.ids.set(node, id);
  }
  return id;
}

/**
 * @param {Interner} interner
 * @param {import('postcss').AnyNode} node
 * @return {number}
 */
function computeNodeId(interner, node) {
  if (node.type === 'decl') {
    return interner.declarations.keyOf(node);
  }

  let trie = step(interner.declarations.root, node.type);
  let layered = false;
  if (node.type === 'rule') {
    trie = step(trie, node.selector);
  } else if (node.type === 'atrule') {
    trie = step(trie, node.name);
    trie = step(trie, node.params);
    trie = step(trie, trimValue(node.raws.before));
    trie = step(trie, trimValue(node.raws.afterName));
    layered = node.name.toLowerCase() === 'layer';
  }

  // A statement has no block, so it never equals a block with the same prelude.
  const { nodes } = /** @type {{ nodes?: import('postcss').ChildNode[] }} */ (
    node
  );
  if (nodes) {
    trie = step(trie, nodes.length);
    for (const child of nodes) {
      const childId = nodeId(interner, child);
      layered ||= interner.layered.has(childId);
      trie = step(trie, childId);
    }
  }

  const id = interner.declarations.leafOf(trie);
  if (layered) {
    interner.layered.add(id);
  }
  return id;
}

/**
 * @param {Scope} scope
 * @param {string} key
 * @return {Scope}
 */
function childScope(scope, key) {
  const children = (scope.children ??= new Map());
  let child = children.get(key);
  if (!child) {
    child = {};
    children.set(key, child);
  }
  return child;
}

/**
 * @param {import('postcss').Rule} rule
 * @param {Map<string, Map<number, import('postcss').AnyNode>>} seenRuleDecls
 * @param {Interner} interner
 * @return {void}
 */
function dedupeRule(rule, seenRuleDecls, interner) {
  let isSubsequent = true;
  let declMap = seenRuleDecls.get(rule.selector);
  if (!declMap) {
    isSubsequent = false;
    declMap = new Map();
    seenRuleDecls.set(rule.selector, declMap);
  }

  let hasContainers = false;

  const { nodes } = rule;
  if (nodes) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const child = nodes[i];
      if (child.type === 'decl') {
        dedupeDecl(child, declMap, interner);
      } else if (child.type === 'rule' || child.type === 'atrule') {
        hasContainers = true;
      }
    }
  }

  if (isSubsequent && !hasContent(rule)) {
    detach(rule);
  } else if (hasContainers) {
    dedupe(rule, {}, interner);
  } else {
    applyChildEdits(rule);
  }
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {Map<number, import('postcss').AnyNode>} seenDecls
 * @param {Interner} interner
 * @return {void}
 */
function dedupeDecl(decl, seenDecls, interner) {
  const id = interner.declarations.keyOf(decl);
  if (seenDecls.has(id)) {
    detach(decl);
  } else {
    seenDecls.set(id, decl);
  }
}

/**
 * Comments starting with `/*!` are preserved by minifiers, so a container
 * that holds one is not discarded with its emptied contents. Children removed
 * by a pending edit no longer count.
 * @param {import('postcss').Rule | import('postcss').AtRule} container
 * @return {boolean} whether the block holds anything but ordinary comments
 */
function hasContent(container) {
  return Boolean(
    container.nodes?.some(
      (node) =>
        node.parent === container &&
        (node.type !== 'comment' || isImportantComment(node.text))
    )
  );
}

/**
 * @param {import('postcss').AtRule} atrule
 * @param {Map<number, import('postcss').AnyNode>} seenAtRules
 * @param {Scope} scope
 * @param {Interner} interner
 * @return {void}
 */
function dedupeAtRule(atrule, seenAtRules, scope, interner) {
  const name = atrule.name.toLowerCase();
  // Blocks of one named layer form a single layer; anonymous ones are distinct.
  if (name === 'layer') {
    if (atrule.nodes) {
      dedupe(
        atrule,
        isAnonymousLayer(atrule)
          ? {}
          : childScope(scope, `layer\0${atrule.params}`),
        interner
      );
    }
    return;
  }

  if (atrule.nodes) {
    if (conditionalAtRules.has(name)) {
      // An emptied conditional group has no effect.
      const hadContent = hasContent(atrule);
      dedupe(atrule, childScope(scope, `${name}\0${atrule.params}`), interner);
      if (hadContent && !hasContent(atrule)) {
        detach(atrule);
        return;
      }
    } else {
      dedupe(atrule, {}, interner);
    }
  }

  // An imported style sheet may declare layers, so even an identical earlier
  // @import can fix a layer's place in the layer order.
  if (name === 'import') {
    return;
  }

  const id = nodeId(interner, atrule);
  // A block that declares a named layer keeps its place in the layer order.
  if (seenAtRules.has(id) && !interner.layered.has(id)) {
    detach(atrule);
  } else {
    seenAtRules.set(id, atrule);
  }
}

/**
 * @param {import('postcss').AnyNode} node
 * @param {Scope} scope
 * @param {Interner} interner
 * @return {void}
 */
function dedupe(node, scope, interner) {
  const container =
    /** @type {import('postcss').Container<import('postcss').ChildNode>} */ (
      node
    );
  const { nodes } = container;

  if (!nodes || nodes.length === 0) {
    return;
  }

  /** @type {Map<number, import('postcss').AnyNode> | undefined} */
  let seenAtRules;

  // Removals are deferred, so the child list stays fixed during the scan and
  // is rebuilt once at the end.
  for (let i = nodes.length - 1; i >= 0; i--) {
    const child = nodes[i];
    if (!child.parent) {
      continue;
    }

    switch (child.type) {
      case 'decl':
        dedupeDecl(child, (scope.decls ??= new Map()), interner);
        break;
      case 'rule':
        dedupeRule(child, (scope.ruleDecls ??= new Map()), interner);
        break;
      case 'atrule':
        dedupeAtRule(child, (seenAtRules ??= new Map()), scope, interner);
        break;
    }
  }
  applyChildEdits(container);
}

/**
 * Removes duplicate rules, declarations and at-rules from the tree.
 * @param {import('postcss').Root} css
 * @param {import('../../../ir/runContext.js').RunContext} [context] the run's state, shared with rule merging
 * @return {void}
 */
export function discardDuplicates(css, context = createRunContext()) {
  dedupe(css, {}, createInterner(context.declarations));
}
