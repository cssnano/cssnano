import cssnanoUtils from 'cssnano-utils';
import { isConditionalGroupRule } from './lastWriteIndex.js';

const { asciiLowerCase, isAnonymousLayer } = cssnanoUtils;

/** @import {ChildNode, Container} from 'postcss' */

/**
 * What collaborators may use: they ask whether a block is gone.
 *
 * @typedef {Pick<DroppableBlocks, 'isEmptied'>} BlockReader
 */

/** @param {ChildNode} node @return {boolean} */
function isNamedLayerBlock(node) {
  return (
    node.type === 'atrule' &&
    asciiLowerCase(node.name) === 'layer' &&
    node.nodes !== undefined &&
    !isAnonymousLayer(node)
  );
}

/**
 * True for a block that applies nothing once it is empty.
 *
 * @param {ChildNode} node
 * @return {boolean}
 */
function isDroppableWhenEmpty(node) {
  return isConditionalGroupRule(node) || isNamedLayerBlock(node);
}

/**
 * Counts the children left in each conditional group rule or named `@layer`
 * block that a rule moved out of, and in each droppable block enclosing one of
 * those. An enclosing block shared with the merge target never reaches none.
 * One that left none applies nothing, so it is invisible to the sweep and
 * removed when the stylesheet is written. A rule moves only from a block into
 * an equivalent earlier one, which already places a layer in the cascade
 * order.
 *
 * Counts start from the children in the source stylesheet and follow every
 * change of the slots. A block that is empty in the source is not tracked: no
 * rule moved out of it, and it may be the first statement that orders its
 * layer.
 */
export default class DroppableBlocks {
  /** @type {Map<Container, number>} */
  #remaining = new Map();

  /**
   * Starts tracking `node` if it applies nothing once empty and has children.
   *
   * @param {ChildNode} node
   * @return {void}
   */
  register(node) {
    const nodes = /** @type {ChildNode[]} */ (
      /** @type {Container} */ (node).nodes
    );
    if (nodes.length > 0 && isDroppableWhenEmpty(node)) {
      this.#remaining.set(/** @type {Container} */ (node), nodes.length);
    }
  }

  /**
   * @param {ChildNode | Container} node
   * @return {boolean} whether a rule moved out of `node` and left it no child
   */
  isEmptied(node) {
    return this.#remaining.get(/** @type {Container} */ (node)) === 0;
  }

  /** @return {Set<Container>} the blocks to remove when the stylesheet is written */
  emptiedBlocks() {
    const emptied = new Set();
    for (const [block, count] of this.#remaining.entries()) {
      if (count === 0) {
        emptied.add(block);
      }
    }
    return emptied;
  }

  /**
   * Accounts for the move of a rule from `source` into `target`.
   *
   * @param {Container} source
   * @param {Container} target
   * @return {void}
   */
  moved(source, target) {
    this.changed(source, -1);
    this.changed(target, 1);
  }

  /**
   * Tells the parent of a block that just lost its last child. An empty block
   * applies nothing, so its parent has one child fewer and is dropped in turn
   * if that was its last. Only a block that is droppable when empty is climbed
   * to: a style rule or any other at-rule stays.
   *
   * @param {Container} emptied
   */
  #climbFrom(emptied) {
    const parent = /** @type {Container | undefined} */ (emptied.parent);
    if (!parent || !isDroppableWhenEmpty(/** @type {ChildNode} */ (parent))) {
      return;
    }
    const known = this.#remaining.get(parent);
    // A parent that is empty in the source is not tracked, and holds no child.
    if (known === undefined) return;
    this.#remaining.set(parent, known - 1);
    if (known === 1) this.#climbFrom(parent);
  }

  /**
   * Accounts for `container` gaining rules, or losing them when `change` is
   * negative.
   *
   * @param {Container} container
   * @param {number} change
   * @return {void}
   */
  changed(container, change) {
    const count = this.#remaining.get(container);
    if (count === undefined) return;
    this.#remaining.set(container, count + change);
    // A block already empty has told its parent; telling it again would
    // undercount the parent.
    if (count > 0 && count + change === 0) this.#climbFrom(container);
  }
}
