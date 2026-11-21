/** @import {AnyNode, ChildNode, Container, Declaration} from 'postcss' */

// Marks the end of a component path in a trie.
const LEAF = Symbol('id');

/** @param {Map<unknown, unknown>} trie @param {unknown} key @return {Map<unknown, unknown>} */
export function step(trie, key) {
  let next = /** @type {Map<unknown, unknown> | undefined} */ (trie.get(key));
  if (!next) {
    next = new Map();
    trie.set(key, next);
  }
  return next;
}

/** @param {string} name @return {string} */
function asciiLowerCase(name) {
  return name.replaceAll(/[A-Z]+/gv, (upper) => upper.toLowerCase());
}

/** @param {string} prop @return {string} */
function propertyNameKey(prop) {
  return prop.startsWith('--') ? prop : asciiLowerCase(prop);
}

/** @param {Declaration} declaration @return {string} */
function hackPrefixOf(declaration) {
  return declaration.raws.before?.replaceAll(';', '').trim() ?? '';
}

/** Numbers the structural descriptions of one run, as the production interner does. */
export class DeclarationKeys {
  /** @type {Map<unknown, unknown>} */
  root = new Map();
  #lastId = 0;

  /** @param {Declaration} declaration @return {number} */
  keyOf(declaration) {
    let trie = step(this.root, 'decl');
    trie = step(trie, propertyNameKey(declaration.prop));
    trie = step(trie, declaration.value);
    trie = step(trie, declaration.important === true);
    return this.leafOf(step(trie, hackPrefixOf(declaration)));
  }

  /** @param {Map<unknown, unknown>} trie @return {number} */
  leafOf(trie) {
    let id = /** @type {number | undefined} */ (trie.get(LEAF));
    if (id === undefined) {
      id = ++this.#lastId;
      trie.set(LEAF, id);
    }
    return id;
  }
}

/**
 * The removals of one container, applied in one rebuild of its child list.
 * A detached node loses its parent at once. Only detaching occurs here.
 */
const pendingEdits = new WeakMap();

/** @param {ChildNode} node */
export function detach(node) {
  const container = node.parent;
  if (!container) return;
  if (!pendingEdits.has(container)) pendingEdits.set(container, null);
  node.parent = undefined;
}

/** @param {ChildNode[]} children @param {ChildNode} node @param {Container} container */
function appendInDocumentOrder(children, node, container) {
  if (node.parent === container) children.push(node);
}

/** @param {Container} container */
export function applyChildEdits(container) {
  if (!pendingEdits.has(container)) return;
  pendingEdits.delete(container);
  const nodes = container.nodes ?? [];
  /** @type {ChildNode[]} */
  const children = [];
  for (const node of nodes) appendInDocumentOrder(children, node, container);
  const [first] = nodes;
  if (
    container.type === 'root' &&
    first.parent !== container &&
    children.length > 0
  ) {
    children[0].raws.before = first.raws.before;
  }
  container.removeAll();
  for (const node of children) container.push(node);
}

/**
 * Only the layer's name is compared, so a prelude with a comment is anonymous
 * when no other text is in it. The copies take preludes of identifiers and
 * comments only, which the generator keeps to.
 * @param {import('postcss').AtRule} node
 * @return {boolean}
 */
export function isAnonymousLayer(node) {
  const params = node.params?.trim();
  if (!params) return true;
  if (!params.includes('/*')) return false;
  return params.replaceAll(/\/\*[\s\S]*?\*\//gv, '').trim() === '';
}

/** @param {string} text @return {boolean} */
export function isImportantComment(text) {
  return text.startsWith('!');
}
