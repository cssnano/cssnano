import { BlockDeclarations, RUN_END } from './blockDeclarations.js';
import { inheritedSupportOf, setInheritedSupport } from './isFallback.js';
import { endsDeclarationRun } from './decl/declarationRuns.js';
import { keepsValueAsWritten, valueListOf } from '../valueList.js';

/** @import {ChildNode, Container, Declaration} from 'postcss' */
/** @import {TextTable} from '../../../../values/textTable.js' */
/** @import {DeclarationItem} from './blockDeclarations.js' */
/** @import {ValueTables} from '../valueList.js' */

/**
 * The container of a block's declarations: the parent a declaration node
 * points at, which holds a child list.
 *
 * @typedef {NonNullable<Declaration['parent']>} Parent
 */

/**
 * A block's list with the nodes it was read from. Only this module reads the
 * nodes; the reducers see the list.
 *
 * @typedef {object} NodeBlock
 * @property {Parent} container
 * @property {BlockDeclarations} list
 * @property {Declaration[]} nodes the node of each item, by position; a clone's
 * node is made when the block is committed
 */

/**
 * @param {Declaration} node
 * @param {ValueTables} tables
 * @return {DeclarationItem}
 */
function itemOf(node, tables) {
  const kept = keepsValueAsWritten(node, tables.textTable);
  return {
    prop: node.prop,
    value: node.value,
    tokens: tables.tokenLists.get(valueListOf(node, tables)),
    important: Boolean(node.important),
    before: node.raws.before,
    between: node.raws.between,
    importantSpelling: node.raws.important,
    inheritedSupport: inheritedSupportOf(node),
    kept,
    removed: false,
    rewritten: false,
    source: -1,
  };
}

/**
 * Reads the declarations of a block into a list, with the run ends among them.
 *
 * @param {Container} container
 * @param {ValueTables} tables
 * @return {NodeBlock}
 */
export function declarationsFromNodes(container, tables) {
  /** @type {DeclarationItem[]} */
  const items = [];
  /** @type {number[]} */
  const chain = [];
  /** @type {Declaration[]} */
  const nodes = [];
  for (const child of container.nodes ?? []) {
    if (child.type === 'decl') {
      chain.push(items.length);
      items.push(itemOf(child, tables));
      nodes.push(child);
    } else if (endsDeclarationRun(/** @type {ChildNode} */ (child))) {
      chain.push(RUN_END);
    }
  }
  return {
    container: /** @type {Parent} */ (container),
    list: new BlockDeclarations(items, chain),
    nodes,
  };
}

/**
 * Makes the node of a clone from the node of its source, with the clone's
 * fields. Clones always set the property and the value, so the raw value goes.
 *
 * @param {Declaration} source
 * @param {DeclarationItem} item
 * @param {TextTable} textTable
 * @return {Declaration}
 */
function cloneNode(source, item, textTable) {
  const node = source.clone();
  node.prop = item.prop;
  node.important = item.important;
  delete node.raws.value;
  textTable.record(node, item.value, item.tokens);
  if (item.inheritedSupport !== null) {
    setInheritedSupport(node, item.inheritedSupport);
  }
  return node;
}

/**
 * Applies a rewrite to a node in place, so the child list keeps its order. A
 * rewrite drops the raw value, which would restore a comment the text lost.
 *
 * @param {Declaration} node
 * @param {DeclarationItem} item
 * @param {TextTable} textTable
 * @return {void}
 */
function rewriteNode(node, item, textTable) {
  node.prop = item.prop;
  delete node.raws.value;
  textTable.record(node, item.value, item.tokens);
}

/**
 * Writes the block back to its container: the rewrites in place, then the
 * removals and the clones as one rebuild of the child list. Each clone lands
 * directly after its anchor, ahead of the clones the anchor had before it.
 *
 * @param {NodeBlock} block
 * @param {TextTable} textTable
 * @return {void}
 */
export function commitToNodes(block, textTable) {
  const { container, list, nodes } = block;
  const authored = nodes.length;
  /** @type {Map<Declaration, Declaration[]>} */
  const insertions = new Map();
  let rebuild = false;

  for (let position = authored; position < list.length; position++) {
    const item = list.at(position);
    const anchor = nodes[item.source];
    const clone = cloneNode(anchor, item, textTable);
    nodes.push(clone);
    clone.parent = container;
    const following = insertions.get(anchor);
    if (following) following.push(clone);
    else insertions.set(anchor, [clone]);
    rebuild = true;
  }

  for (let position = 0; position < list.length; position++) {
    const item = list.at(position);
    if (item.removed) {
      nodes[position].parent = undefined;
      rebuild = true;
    } else if (item.rewritten && position < authored) {
      rewriteNode(nodes[position], item, textTable);
    }
  }

  if (rebuild) rebuildChildren(container, insertions);
}

/**
 * Lists the nodes in document order: each attached node, then the inserted
 * nodes after it, most recent first so that each lands ahead of the earlier
 * ones. A detached node still anchors what was inserted after it.
 *
 * @param {ChildNode[]} children
 * @param {ChildNode} node
 * @param {Container} container
 * @param {Map<ChildNode, ChildNode[]>} insertions
 * @return {void}
 */
function appendInDocumentOrder(children, node, container, insertions) {
  if (node.parent === container) children.push(node);
  const following = insertions.get(node);
  if (!following) return;
  for (let i = following.length - 1; i >= 0; i--) {
    appendInDocumentOrder(children, following[i], container, insertions);
  }
}

/**
 * Rebuilds the child list once. A root hands the leading whitespace of a
 * removed first child to the next child, as PostCSS does.
 *
 * @param {Container} container
 * @param {Map<ChildNode, ChildNode[]>} insertions
 * @return {void}
 */
function rebuildChildren(container, insertions) {
  const original = container.nodes ?? [];
  /** @type {ChildNode[]} */
  const children = [];
  for (const node of original) {
    appendInDocumentOrder(children, node, container, insertions);
  }
  const [first] = original;
  if (
    container.type === 'root' &&
    first !== undefined &&
    first.parent !== container &&
    children.length > 0
  ) {
    children[0].raws.before = first.raws.before;
  }
  container.removeAll();
  for (const node of children) container.push(node);
}
