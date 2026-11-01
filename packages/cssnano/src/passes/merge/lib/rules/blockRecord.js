/** @import {ChildNode, Container} from 'postcss' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */

/**
 * The record of a container that the merge visits: the stylesheet, an at-rule
 * with a block, or a rule that holds rules or at-rules. `children` has one
 * entry per child, in order: a slot for a rule, or the index in the arena of a
 * block, declaration or bare node. Entries are never spliced out, so a removed
 * entry is left in place and skipped.
 */
export class BlockRecord {
  /** @type {Container} */
  node;

  /** @type {number} the index of the block whose children hold this one's entry, -1 for the stylesheet */
  parent;

  /** @type {number} where the entry stands among the children of `parent` */
  position;

  /** @type {boolean} whether the block applies nothing once it is empty */
  droppable;

  /** @type {(Slot | number)[]} */
  children = [];

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

  /**
   * The live children of a droppable block during a sweep, or null while the
   * block is not tracked. Dropping an emptied `@layer` is safe because a rule
   * moves only into an equivalent earlier block, which already orders the
   * layer. A block empty at sweep start is untracked because it may be the
   * first statement that orders its layer.
   *
   * @type {number | null}
   */
  remaining = null;

  /** @type {boolean} whether a sweep removed the block for being empty */
  dropped = false;

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
   * @param {number} parent the index of the block whose children hold this one's entry, -1 for the stylesheet
   * @param {number} position
   * @param {boolean} droppable
   */
  constructor(node, parent, position, droppable) {
    this.node = node;
    this.parent = parent;
    this.position = position;
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

/**
 * One position among the children of a block. `rules` are the indices of the
 * rules that stand there now, in order, so the slot is empty once every rule
 * left.
 */
export class Slot {
  /** @type {number} the index of the block the slot stands in */
  block;

  /** @type {number} where the slot stands among the children of `block` */
  position;

  /** @type {number[]} the indices of the rules in the slot */
  rules;

  /**
   * @param {number} block the index of the block the slot stands in
   * @param {number} position
   * @param {number[]} rules
   */
  constructor(block, position, rules) {
    this.block = block;
    this.position = position;
    this.rules = rules;
  }
}
