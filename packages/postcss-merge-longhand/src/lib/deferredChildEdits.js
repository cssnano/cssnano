/** @import {ChildNode, Container} from 'postcss'; */

/**
 * PostCSS locates a child by scanning its container, so every removal or
 * insertion costs time linear in the rule, and merging many groups in one long
 * rule turns quadratic. The reducers record their edits here instead, and the
 * child list is rebuilt once when they are done.
 *
 * A detached node loses its parent at once, so liveness checks stay accurate;
 * an inserted node gains its parent at once but joins the child list only when
 * the edits are applied.
 */

/**
 * Containers with pending edits, mapped to the nodes inserted after each
 * anchor in insertion order, or to `null` while they only detach.
 *
 * @type {WeakMap<Container, Map<ChildNode, ChildNode[]> | null>}
 */
const pendingEdits = new WeakMap();

/**
 * @param {ChildNode} node
 * @return {void}
 */
export function detach(node) {
  const container = node.parent;
  if (!container) return;
  if (!pendingEdits.has(container)) pendingEdits.set(container, null);
  node.parent = undefined;
}

/**
 * @param {Container} container
 * @param {ChildNode} anchor - an attached child of `container`, possibly one
 * inserted by an earlier pending edit
 * @param {ChildNode} node - a node without a parent
 * @return {void}
 */
export function insertAfter(container, anchor, node) {
  let insertions = pendingEdits.get(container);
  if (!insertions) {
    insertions = new Map();
    pendingEdits.set(container, insertions);
  }
  const following = insertions.get(anchor);
  if (following) following.push(node);
  else insertions.set(anchor, [node]);
  node.parent = container;
}

/**
 * Appends `node` if it is still attached, then what was inserted after it.
 * Each insertion lands directly after its anchor, ahead of earlier ones.
 *
 * @param {ChildNode[]} children
 * @param {ChildNode} node
 * @param {Container} container
 * @param {Map<ChildNode, ChildNode[]> | null} insertions
 * @return {void}
 */
function appendInDocumentOrder(children, node, container, insertions) {
  if (node.parent === container) children.push(node);
  const following = insertions?.get(node);
  if (!following) return;
  for (let i = following.length - 1; i >= 0; i--) {
    appendInDocumentOrder(children, following[i], container, insertions);
  }
}

/**
 * @param {Container} container - a rule or at-rule, never the root, whose
 * removal also moves the first child's leading whitespace
 * @return {void}
 */
export function applyChildEdits(container) {
  if (!pendingEdits.has(container)) return;
  const insertions = pendingEdits.get(container) ?? null;
  pendingEdits.delete(container);
  /** @type {ChildNode[]} */
  const children = [];
  for (const node of container.nodes ?? []) {
    appendInDocumentOrder(children, node, container, insertions);
  }
  container.removeAll();
  for (const node of children) container.push(node);
}
