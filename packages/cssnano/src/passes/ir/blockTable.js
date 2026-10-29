import { isConditionalGroupRule } from '../merge/lib/rules/lastWriteIndex.js';
import { consistencyChecksEnabled } from './consistencyChecks.js';

/** @import {ChildNode, Container, Declaration, Root} from 'postcss' */

/**
 * What a block's subtree holds, cached until an edit to the subtree drops it.
 *
 * @typedef {{ opaque?: boolean, declarations?: Declaration[] }} Summary
 */

/**
 * @param {ChildNode} node
 * @param {boolean} same whether the cached answer matches the tree
 * @param {string} kind the summary that was read
 * @return {void}
 */
function assertFresh(node, same, kind) {
  if (!same) {
    throw new Error(`stale ${kind} summary of a ${node.type} node`);
  }
}

/**
 * The attached table of each stylesheet, so an edit can find the summaries it
 * must drop from the root alone.
 *
 * @type {WeakMap<object, BlockTable>}
 */
const tablesByRoot = new WeakMap();

/**
 * How many stylesheets hold an attached table, so `invalidate` can skip the
 * climb to the root while none does.
 */
let attachedCount = 0;

/**
 * @return {number} the tables attached to a stylesheet right now
 */
export function attachedTableCount() {
  return attachedCount;
}

/**
 * @param {ChildNode} node
 * @return {boolean} the `opaque` answer, read from the tree alone
 */
function opaqueInTree(node) {
  if (node.type === 'atrule' && !isConditionalGroupRule(node)) return true;
  if (!('nodes' in node) || !node.nodes) return false;
  return node.nodes.some(opaqueInTree);
}

/**
 * @param {ChildNode} node
 * @return {Declaration[]} the `declarations` answer, read from the tree alone
 */
function declarationsInTree(node) {
  if (node.type === 'decl') return [/** @type {Declaration} */ (node)];
  if (!('nodes' in node) || !node.nodes) return [];
  return node.nodes.flatMap(declarationsInTree);
}

/**
 * Summaries of the blocks of one stylesheet, keyed by node. PostCSS stays the
 * source of truth: a summary answers for the subtree as it stood when it was
 * read, and every edit to the subtree calls `invalidate` first.
 *
 * A table built without a root computes each answer from the tree and keeps
 * nothing, so it is never stale.
 */
export class BlockTable {
  /** @type {Map<object, Summary>} */
  #summaries = new Map();

  /** @type {Root | undefined} */
  #root;

  /** @param {Root} [root] the stylesheet this table summarizes */
  constructor(root) {
    this.#root = root;
    if (root) {
      if (!tablesByRoot.has(root)) attachedCount++;
      tablesByRoot.set(root, this);
    }
  }

  /**
   * Stops answering from summaries: the table leaves its stylesheet and
   * drops what it cached. Each later read computes from the tree.
   *
   * @return {void}
   */
  detach() {
    if (!this.#root) return;
    if (tablesByRoot.get(this.#root) === this) {
      tablesByRoot.delete(this.#root);
      attachedCount--;
    }
    this.#root = undefined;
    this.#summaries.clear();
  }

  /**
   * Records a block the build walk reached.
   *
   * @param {Container} block
   * @return {void}
   */
  add(block) {
    if (!this.#summaries.has(block)) this.#summaries.set(block, {});
  }

  /**
   * Drops the summary of `node`, if any.
   *
   * @param {object} node
   * @return {void}
   */
  forget(node) {
    this.#summaries.delete(node);
  }

  /**
   * @param {object} node
   * @return {Summary} the summary to fill, or a throwaway one when unattached
   */
  #summaryOf(node) {
    if (!this.#root) return {};
    let summary = this.#summaries.get(node);
    if (!summary) {
      summary = {};
      this.#summaries.set(node, summary);
    }
    return summary;
  }

  /**
   * True if the subtree holds an at-rule whose position in the cascade is not
   * modelled, so its declarations cannot be reasoned about as plain writes.
   *
   * @param {ChildNode} node
   * @return {boolean}
   */
  opaque(node) {
    if (node.type === 'atrule' && !isConditionalGroupRule(node)) return true;
    if (!('nodes' in node) || !node.nodes) return false;
    const summary = this.#summaryOf(node);
    if (summary.opaque === undefined) {
      summary.opaque = node.nodes.some((child) => this.opaque(child));
    } else if (consistencyChecksEnabled()) {
      assertFresh(node, summary.opaque === opaqueInTree(node), 'opaque');
    }
    return summary.opaque;
  }

  /**
   * The declarations of a block, at any depth. The list is shared by later
   * reads, so callers must not change it.
   *
   * @param {ChildNode} node
   * @return {Declaration[]}
   */
  declarations(node) {
    if (node.type === 'decl') return [node];
    if (!('nodes' in node) || !node.nodes) return [];
    const summary = this.#summaryOf(node);
    if (summary.declarations === undefined) {
      summary.declarations = node.nodes.flatMap((child) =>
        this.declarations(child)
      );
    } else if (consistencyChecksEnabled()) {
      const cached = summary.declarations;
      const fresh = declarationsInTree(node);
      const same =
        fresh.length === cached.length &&
        fresh.every((declaration, i) => declaration === cached[i]);
      assertFresh(node, same, 'declarations');
    }
    return summary.declarations;
  }
}

/**
 * Drops the summaries of `node` and of each ancestor, in the table of the
 * stylesheet that holds `node`. Call it before `node` is removed, moved, or
 * given a child, while it still hangs under its parents, since the ancestors
 * are found through the parent links. A node outside every attached tree
 * reaches no table.
 *
 * @param {ChildNode | Container} node
 * @return {void}
 */
export function invalidate(node) {
  if (attachedCount === 0) return;
  let root = /** @type {ChildNode | Container} */ (node);
  while (root.parent) root = /** @type {ChildNode | Container} */ (root.parent);
  const table = tablesByRoot.get(root);
  if (!table) return;
  for (
    let block = /** @type {Container | undefined} */ (node);
    block;
    block = /** @type {Container | undefined} */ (block.parent)
  ) {
    table.forget(block);
  }
}
