import cssnanoUtils from '#utils';
import { isConditionalGroupRule } from './lastWriteIndex.js';

const { asciiLowerCase, isAnonymousLayer } = cssnanoUtils;

/** @import {ChildNode} from 'postcss' */
/** @import {BlockRecord} from './blockRecords.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */

/**
 * @param {ChildNode} node
 * @param {TextTable} textTable
 * @return {boolean}
 */
function isNamedLayerBlock(node, textTable) {
  return (
    node.type === 'atrule' &&
    asciiLowerCase(node.name) === 'layer' &&
    node.nodes !== undefined &&
    !isAnonymousLayer(node, textTable)
  );
}

/**
 * True for a block that applies nothing once it is empty.
 *
 * @param {ChildNode} node
 * @param {TextTable} textTable
 * @return {boolean}
 */
export function isDroppableWhenEmpty(node, textTable) {
  return isConditionalGroupRule(node) || isNamedLayerBlock(node, textTable);
}

/**
 * Counts the live children left in each droppable block that a rule moved out
 * of, and in each droppable block enclosing one of those. An enclosing block
 * shared with the merge target never reaches none. One that left none applies
 * nothing, so it is invisible to the sweep and removed when the stylesheet is
 * written. A rule moves only from a block into an equivalent earlier one,
 * which already places a layer in the cascade order.
 *
 * The count is kept on the block record, `remaining`, and each change to a
 * slot updates it. A block that is empty at the start of a sweep is not
 * tracked: no rule moved out of it, and it may be the first statement that
 * orders its layer.
 */
export default class DroppableBlocks {
  /**
   * @param {BlockRecord} block
   * @return {boolean} whether a sweep removes the block once it is empty
   */
  isEmptied(block) {
    return block.remaining === 0;
  }

  /**
   * Accounts for the move of a rule from `source` into `target`.
   *
   * @param {BlockRecord} source
   * @param {BlockRecord} target
   * @return {void}
   */
  moved(source, target) {
    this.changed(source, -1);
    this.changed(target, 1);
  }

  /**
   * Tells the parent of a block that just lost its last child. An empty block
   * applies nothing, so its parent has one child fewer and is dropped in turn
   * if that was its last. Only a droppable block is climbed to: a style rule
   * or any other at-rule stays.
   *
   * @param {BlockRecord} emptied
   * @return {void}
   */
  #climbFrom(emptied) {
    const parent = emptied.parent;
    if (!parent || !parent.droppable) return;
    const known = parent.remaining;
    // A parent that is empty in the source is not tracked, and holds no child.
    if (known === null) return;
    parent.remaining = known - 1;
    if (known === 1) this.#climbFrom(parent);
  }

  /**
   * Accounts for `block` gaining rules, or losing them when `change` is
   * negative.
   *
   * @param {BlockRecord} block
   * @param {number} change
   * @return {void}
   */
  changed(block, change) {
    const count = block.remaining;
    if (count === null) return;
    block.remaining = count + change;
    // A block already empty has told its parent; telling it again would
    // undercount the parent.
    if (count > 0 && count + change === 0) this.#climbFrom(block);
  }
}
