/** @import {ChildNode, Container} from 'postcss' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */

/**
 * The record of a container that the merge visits: the stylesheet, an at-rule
 * with a block, or a rule that holds rules or at-rules. Its children are the
 * entries its chain links, which `BlockRecords` keeps.
 */
export class BlockRecord {
  /** @type {Container} */
  node;

  /** @type {boolean} whether the block applies nothing once it is empty */
  droppable;

  /**
   * The first entry of the chain of live children, which `BlockRecords` links,
   * or -1 when the block holds none.
   *
   * @type {number}
   */
  first = -1;

  /**
   * The last entry of the chain of live children, or -1 when the block holds
   * none.
   *
   * @type {number}
   */
  last = -1;

  /**
   * The number of entries in the chain, kept by each link and unlink.
   *
   * @type {number}
   */
  count = 0;

  /** @type {number} the place of the block in the arena of its records, -1 until added */
  index = -1;

  /**
   * The id of the circumstances under which the block applies its content, as
   * `containerContext` gives it. A block moves only between equal containers,
   * so the id holds for the whole run.
   *
   * @type {number}
   */
  context = -1;

  /**
   * The whitespace before the first child of the stylesheet, which PostCSS
   * hands on when that child is removed. Only the record of the stylesheet
   * holds it.
   *
   * @type {string | undefined}
   */
  leadingWhitespace = undefined;

  /**
   * @param {Container} node
   * @param {boolean} droppable
   */
  constructor(node, droppable) {
    this.node = node;
    this.droppable = droppable;
  }
}

/**
 * A child of a block that is neither a rule, an at-rule with a block, nor a
 * declaration: a comment or a statement at-rule. It takes an index in the arena
 * so that a block's children hold indices alone.
 */
export class NodeEntry {
  /** @type {ChildNode} the node the entry stands for */
  node;

  /** @type {number} the place of the entry in the arena, -1 until added */
  index = -1;

  /** @param {ChildNode} node */
  constructor(node) {
    this.node = node;
  }
}
