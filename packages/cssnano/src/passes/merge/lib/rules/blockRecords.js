/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import MergeState from './mergeState.js' */

/**
 * One position among the children of a block. `rules` are the rules that
 * stand there now, in order, so the slot is empty once every rule left.
 */
export class Slot {
  /** @type {BlockRecord} the block the slot stands in */
  block;

  /** @type {number} where the slot stands among the children of `block` */
  position;

  /** @type {Rule[]} */
  rules;

  /**
   * @param {BlockRecord} block
   * @param {number} position
   * @param {Rule[]} rules
   */
  constructor(block, position, rules) {
    this.block = block;
    this.position = position;
    this.rules = rules;
  }
}

/**
 * The record of a container that the merge visits: the stylesheet, an at-rule
 * with a block, or a rule that holds rules or at-rules. `children` has one
 * entry per child, in order: a slot for a rule, the record of a nested
 * at-rule, or the PostCSS node of anything else. Entries are never spliced
 * out, so a removed entry is left in place and skipped.
 */
export class BlockRecord {
  /** @type {Container} */
  node;

  /** @type {BlockRecord | null} the block whose children hold this one's entry */
  parent;

  /** @type {number} where the entry stands among the children of `parent` */
  position;

  /** @type {boolean} whether the block applies nothing once it is empty */
  droppable;

  /** @type {(Slot | BlockRecord | ChildNode)[]} */
  children = [];

  /**
   * The live children of a droppable block during a sweep, or null while the
   * block is not tracked.
   *
   * @type {number | null}
   */
  remaining = null;

  /** @type {boolean} whether a sweep removed the block for being empty */
  dropped = false;

  /**
   * @param {Container} node
   * @param {BlockRecord | null} parent
   * @param {number} position
   * @param {boolean} droppable
   */
  constructor(node, parent, position, droppable) {
    this.node = node;
    this.parent = parent;
    this.position = position;
    this.droppable = droppable;
  }

  /**
   * Takes the children of `source` after its own. Each rule gets a slot here,
   * and each block a rule holds gets this block as its parent. `source` is
   * left with no children, since the caller removes it.
   *
   * @param {BlockRecord} source
   * @param {BlockRecords} records
   * @return {void}
   */
  adopt(source, records) {
    for (const entry of source.children) {
      if (entry instanceof Slot) {
        if (entry.rules.length === 0) continue;
        const slot = new Slot(this, this.children.length, entry.rules);
        for (const rule of entry.rules) {
          const meta = records.metaOf(rule);
          meta.place(slot);
          if (meta.block) {
            meta.block.parent = this;
            meta.block.position = slot.position;
          }
        }
        this.children.push(slot);
      } else if (entry instanceof BlockRecord) {
        if (entry.dropped) continue;
        entry.parent = this;
        entry.position = this.children.length;
        this.children.push(entry);
      } else {
        this.children.push(entry);
      }
    }
    source.children = [];
  }
}

/**
 * The records of one run: the block of each container, and the rule records
 * the run keeps in step with the tree.
 */
export class BlockRecords {
  /** @type {BlockRecord} the record of the stylesheet */
  root;

  /** @type {Map<Container, BlockRecord>} */
  #blocks = new Map();

  /** @type {MergeState} */
  #mergeState;

  /**
   * @param {MergeState} mergeState
   * @param {BlockRecord} root the record of the stylesheet
   */
  constructor(mergeState, root) {
    this.#mergeState = mergeState;
    this.root = root;
  }

  /**
   * @param {BlockRecord} block
   * @return {void}
   */
  add(block) {
    this.#blocks.set(block.node, block);
  }

  /**
   * @param {Container} node
   * @return {BlockRecord | undefined} the record of a container, if it has one
   */
  blockOf(node) {
    return this.#blocks.get(node);
  }

  /**
   * @param {Rule} rule
   * @return {import('./ruleMeta.js').RuleMeta} the record of the rule
   */
  metaOf(rule) {
    return this.#mergeState.meta(rule);
  }
}
