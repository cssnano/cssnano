import { BlockRecord, Slot } from './blockRecords.js';

/** @import {ChildNode, Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */

/**
 * Moves and replaces rules in the slots of the block records. The records keep
 * the only state; this class holds a reference to them.
 */
export default class SlotIndex {
  /** @type {BlockRecords} */
  #records;

  /** @param {BlockRecords} records */
  constructor(records) {
    this.#records = records;
  }

  /**
   * The nodes a block holds now, in order: the rules of its slots, and the
   * nodes of its other entries, except a block that was dropped.
   *
   * @param {BlockRecord} block
   * @return {(Rule | ChildNode)[]}
   */
  childrenOf(block) {
    /** @type {(Rule | ChildNode)[]} */
    const children = [];
    for (const entry of block.children) {
      if (entry instanceof Slot) {
        children.push(...entry.rules);
      } else if (entry instanceof BlockRecord) {
        if (!entry.dropped)
          children.push(/** @type {ChildNode} */ (entry.node));
      } else {
        children.push(entry);
      }
    }
    return children;
  }

  /**
   * Moves `rule` out of `from` into a new slot after the last child of
   * `target`.
   *
   * @param {Rule} rule
   * @param {Slot} from
   * @param {BlockRecord} target
   * @return {Slot} the slot that now holds `rule`
   */
  moveRule(rule, from, target) {
    from.rules.splice(from.rules.indexOf(rule), 1);
    const slot = new Slot(target, target.children.length, [rule]);
    target.children.push(slot);
    this.#records.metaOf(rule).place(slot);
    return slot;
  }

  /**
   * @param {Slot} slot
   * @param {Rule} rule the rule that stands in `slot` and is replaced
   * @param {Rule[]} replacements
   */
  substitute(slot, rule, replacements) {
    slot.rules.splice(slot.rules.indexOf(rule), 1, ...replacements);
    for (const replacement of replacements) {
      this.#records.metaOf(replacement).place(slot);
    }
  }
}
