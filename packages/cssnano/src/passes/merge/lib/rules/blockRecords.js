/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
import {
  DeclarationRecord,
  recordDeclaration,
} from '../../../ir/declarationRecord.js';
import { RuleRecord, isDeclaration } from './ruleRecord.js';
/** @import {BlockRecord} from './blockRecord.js' */

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

/**
 * The records of one run: the stylesheet's block, and an arena of every block
 * record and one of every rule record. Ownership is a tree: a block owns its
 * slots and declarations, a rule its declarations, and every other relation is
 * an index into an arena, never reused within a run. So an edit that touches
 * more than one record is a method here.
 */
export class BlockRecords {
  /** @type {BlockRecord} the record of the stylesheet */
  root;

  /** @type {BlockRecord[]} every block record added, dropped ones included */
  #blocks = [];

  /** @type {RuleRecord[]} every rule record recorded, departed ones included */
  #rules = [];

  /** @type {Map<string, number> | null} declarations the input wrote, under checks */
  inputWrites = null;

  /**
   * The most rounds a run may take before it throws. Set from the counts of
   * rules, at-rules and declarations when the records are built.
   *
   * @type {number}
   */
  maxRounds = Infinity;

  /**
   * @param {BlockRecord} root the record of the stylesheet
   */
  constructor(root) {
    this.root = root;
  }

  /**
   * Adds a block record to the arena, which gives it the next index.
   *
   * @param {BlockRecord} block
   * @return {void}
   */
  add(block) {
    block.index = this.#blocks.length;
    this.#blocks.push(block);
  }

  /**
   * @param {number} index an index that `add` gave, or -1 for no block
   * @return {BlockRecord | undefined}
   */
  block(index) {
    return this.#blocks[index];
  }

  /**
   * @param {number} index an index that `recordRule` gave
   * @return {RuleRecord | undefined}
   */
  rule(index) {
    return this.#rules[index];
  }

  /**
   * @return {number} the rule records recorded so far, departed ones included
   */
  ruleCount() {
    return this.#rules.length;
  }

  /**
   * The records of every block the run added, dropped ones included.
   *
   * @return {IterableIterator<BlockRecord>}
   */
  blocks() {
    return this.#blocks.values();
  }

  /**
   * The slot a placed rule stands in.
   *
   * @param {RuleRecord} record
   * @return {Slot}
   */
  slotOf(record) {
    const block = /** @type {BlockRecord} */ (this.block(record.slotBlock));
    return /** @type {Slot} */ (block.children[record.slotPosition]);
  }

  /**
   * @param {number} index
   * @return {boolean} whether the block at `index` was dropped by a sweep
   */
  #dropped(index) {
    return /** @type {BlockRecord} */ (this.block(index)).dropped;
  }

  /**
   * Accounts for the block at `index` gaining `change` live children, or losing
   * them when negative. A droppable block that is tracked and goes empty tells
   * its parent, which may go empty in turn.
   *
   * @param {number} index
   * @param {number} change
   * @return {void}
   */
  changed(index, change) {
    const block = this.#blocks[index];
    const count = block.remaining;
    if (count === null) return;
    block.remaining = count + change;
    // A block already empty has told its parent; telling it again would
    // undercount the parent.
    if (count > 0 && count + change === 0) this.#climb(block);
  }

  /**
   * Tells the parent of a block that just lost its last child. Only a
   * droppable parent is climbed to: a style rule or any other at-rule stays.
   *
   * @param {BlockRecord} block
   * @return {void}
   */
  #climb(block) {
    const parent = this.block(block.parent);
    if (!parent || !parent.droppable) return;
    const known = parent.remaining;
    // A parent that is empty in the source is not tracked, and holds no child.
    if (known === null) return;
    parent.remaining = known - 1;
    if (known === 1) this.#climb(parent);
  }

  /**
   * The first child the block at `index` holds now, without copying the child
   * list.
   *
   * @param {number} index
   * @return {ChildNode | undefined}
   */
  firstLiveChild(index) {
    const block = /** @type {BlockRecord} */ (this.block(index));
    const { children } = block;
    for (; block.firstLive < children.length; block.firstLive++) {
      const entry = children[block.firstLive];
      if (entry instanceof Slot) {
        if (entry.rules.length > 0) {
          return /** @type {RuleRecord} */ (this.rule(entry.rules[0])).node;
        }
      } else if (typeof entry === 'number') {
        const nested = /** @type {BlockRecord} */ (this.block(entry));
        if (!nested.dropped) return /** @type {ChildNode} */ (nested.node);
      } else if (entry instanceof DeclarationRecord) {
        return entry.node;
      } else {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * The number of children the block at `index` holds now, counted without
   * copying them.
   *
   * @param {number} index
   * @return {number}
   */
  liveCount(index) {
    let count = 0;
    const { children } = /** @type {BlockRecord} */ (this.block(index));
    for (const entry of children) {
      if (entry instanceof Slot) {
        count += entry.rules.length;
      } else if (typeof entry !== 'number' || !this.#dropped(entry)) {
        count++;
      }
    }
    return count;
  }

  /**
   * The entries the block at `index` holds now, in order: the record of each
   * rule, the record of each at-rule block, and the node of anything else. A
   * block that was dropped is left out.
   *
   * @param {number} index
   * @return {(RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[]}
   */
  liveEntries(index) {
    /** @type {(RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[]} */
    const entries = [];
    const { children } = /** @type {BlockRecord} */ (this.block(index));
    for (const entry of children) {
      if (entry instanceof Slot) {
        for (const rule of entry.rules) {
          entries.push(/** @type {RuleRecord} */ (this.rule(rule)));
        }
      } else if (typeof entry === 'number') {
        if (!this.#dropped(entry)) {
          entries.push(/** @type {BlockRecord} */ (this.block(entry)));
        }
      } else {
        entries.push(entry);
      }
    }
    return entries;
  }

  /**
   * The children the block at `index` holds now, in order: the rules of its
   * slots, and the nodes of its other entries, except a block that was dropped.
   *
   * @param {number} index
   * @return {ChildNode[]}
   */
  liveChildren(index) {
    /** @type {ChildNode[]} */
    const children = [];
    const holder = /** @type {BlockRecord} */ (this.block(index));
    for (const entry of holder.children) {
      if (entry instanceof Slot) {
        for (const rule of entry.rules) {
          children.push(/** @type {RuleRecord} */ (this.rule(rule)).node);
        }
      } else if (typeof entry === 'number') {
        const nested = /** @type {BlockRecord} */ (this.block(entry));
        if (!nested.dropped)
          children.push(/** @type {ChildNode} */ (nested.node));
      } else if (entry instanceof DeclarationRecord) {
        children.push(entry.node);
      } else {
        children.push(entry);
      }
    }
    return children;
  }

  /**
   * Replaces the rule `record` in `slot` with the rules `replacements`, and
   * places each of them in the slot.
   *
   * @param {Slot} slot the slot that holds `record` and is given the replacements
   * @param {number} record the index of the rule that stands in the slot and is replaced
   * @param {number[]} replacements
   * @return {void}
   */
  substitute(slot, record, replacements) {
    slot.rules.splice(slot.rules.indexOf(record), 1, ...replacements);
    for (const replacement of replacements) {
      /** @type {RuleRecord} */ (this.rule(replacement)).place(
        slot.block,
        slot.position
      );
    }
  }

  /**
   * Moves the rule `record` out of its slot into a new slot after the last
   * child of the block at `target`.
   *
   * @param {number} target the index of the block that takes the rule
   * @param {number} record the index of the rule
   * @return {Slot} the slot that now holds the rule
   */
  moveRule(target, record) {
    const rule = /** @type {RuleRecord} */ (this.rule(record));
    const from = this.slotOf(rule);
    from.rules.splice(from.rules.indexOf(record), 1);
    const holder = /** @type {BlockRecord} */ (this.block(target));
    const slot = new Slot(target, holder.children.length, [record]);
    holder.children.push(slot);
    rule.place(target, slot.position);
    return slot;
  }

  /**
   * Takes the children of the block at `source` after those of the block at
   * `target`. Each rule gets a slot in `target`, and each block a rule holds
   * gets `target` as its parent. `source` is left with no children, since the
   * caller removes it.
   *
   * @param {number} target
   * @param {number} source
   * @return {void}
   */
  adopt(target, source) {
    const holder = /** @type {BlockRecord} */ (this.block(target));
    const from = /** @type {BlockRecord} */ (this.block(source));
    for (const entry of from.children) {
      if (entry instanceof Slot) {
        if (entry.rules.length === 0) continue;
        const slot = new Slot(target, holder.children.length, entry.rules);
        for (const index of entry.rules) {
          const record = /** @type {RuleRecord} */ (this.rule(index));
          record.place(target, slot.position);
          if (record.block !== -1) {
            const nested = /** @type {BlockRecord} */ (
              this.block(record.block)
            );
            nested.parent = target;
            nested.position = slot.position;
          }
        }
        holder.children.push(slot);
      } else if (typeof entry === 'number') {
        const nested = /** @type {BlockRecord} */ (this.block(entry));
        if (nested.dropped) continue;
        nested.parent = target;
        nested.position = holder.children.length;
        holder.children.push(entry);
      } else {
        holder.children.push(entry);
      }
    }
    from.children = [];
  }

  /**
   * Builds the record of a declaration that is a child of a block.
   *
   * @param {import('postcss').Declaration} node
   * @param {PropertyTable} properties the keys of the property names
   * @param {DeclarationKeys} declarations the ids of the declarations
   * @return {DeclarationRecord}
   */
  declarationRecord(node, properties, declarations) {
    return recordDeclaration(node, properties, declarations);
  }

  /**
   * Builds the record of a rule and adds it to the arena, which gives it the
   * next index. The slot the caller places it in is what holds it.
   *
   * @param {Rule} rule
   * @param {PropertyTable} properties the keys of the property names
   * @param {DeclarationKeys} declarations the ids of the declarations
   * @param {DeclarationRecord[] | null} [records] the records of the rule's
   * declarations, in order, when the caller holds them already, such as the
   * records a rule hands to a new rule; null to record each declaration of the
   * rule
   * @return {RuleRecord}
   */
  recordRule(rule, properties, declarations, records = null) {
    let children = records;
    if (children === null) {
      // A loop, since `filter` and `map` would each allocate a list of nodes.
      children = [];
      for (const node of rule.nodes) {
        if (isDeclaration(node)) {
          children.push(this.declarationRecord(node, properties, declarations));
        }
      }
    }
    const record = new RuleRecord(rule, rule.selectors, children);
    record.index = this.#rules.length;
    this.#rules.push(record);
    return record;
  }
}
