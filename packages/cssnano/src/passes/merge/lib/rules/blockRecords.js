/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
import { recordDeclaration } from '../../../ir/declarationRecord.js';
import { BlockLinks } from './blockLinks.js';
import { BlockRecord, NodeEntry, Slot } from './blockRecord.js';
import {
  firstLiveChild,
  liveChildren,
  liveCount,
  liveEntries,
} from './blockChildren.js';
import { RuleRecord, isDeclaration } from './ruleRecord.js';

export { Slot } from './blockRecord.js';

/**
 * The records of one run. One arena holds every block record, every rule record,
 * every declaration of a block and every bare node of a block, each at the next
 * index of one counter; an index is never reused within a run. A block's children
 * are slots and arena indices, and a rule's own declarations stay in its record.
 * Ownership is a tree, so an edit that touches more than one record is a method
 * here.
 */
export class BlockRecords {
  /** @type {BlockRecord} the record of the stylesheet */
  root;

  /** @type {(BlockRecord | RuleRecord | DeclarationRecord | NodeEntry)[]} every entry, by index, dropped and departed ones included */
  #entries = [];

  /** @type {BlockLinks} the chains of the blocks, and each entry's container */
  links = new BlockLinks(this);

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
   * Gives an entry the next index of the arena and keeps it there.
   *
   * @template {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry} T
   * @param {T} entry
   * @return {T}
   */
  #place(entry) {
    entry.index = this.#entries.length;
    this.#entries.push(entry);
    this.links.grow();
    return entry;
  }

  /**
   * Adds a block record to the arena, which gives it the next index.
   *
   * @param {BlockRecord} block
   * @return {void}
   */
  add(block) {
    this.#place(block);
  }

  /**
   * @param {number} index an index that the arena gave
   * @return {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry}
   */
  entry(index) {
    return this.#entries[index];
  }

  /**
   * @param {number} index an index that `add` gave, or -1 for no block
   * @return {BlockRecord | undefined}
   */
  block(index) {
    return /** @type {BlockRecord | undefined} */ (this.#entries[index]);
  }

  /**
   * @param {number} index an index that the arena gave
   * @return {BlockRecord | undefined} the block at `index`, or undefined when the entry is another kind
   */
  blockEntry(index) {
    const entry = this.#entries[index];
    return entry instanceof BlockRecord ? entry : undefined;
  }

  /**
   * @param {number} index an index that `recordRule` gave
   * @return {RuleRecord | undefined}
   */
  rule(index) {
    return /** @type {RuleRecord | undefined} */ (this.#entries[index]);
  }

  /**
   * @return {number} the entries the arena holds, dropped and departed ones included
   */
  entryCount() {
    return this.#entries.length;
  }

  /**
   * The records of every block the run added, dropped ones included.
   *
   * @return {Generator<BlockRecord>}
   */
  *blocks() {
    for (const entry of this.#entries) {
      if (entry instanceof BlockRecord) yield entry;
    }
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
   * The PostCSS node of the entry at `index`, which is a block, a declaration or
   * a bare node.
   *
   * @param {number} index
   * @return {ChildNode}
   */
  nodeOf(index) {
    return /** @type {ChildNode} */ (
      /** @type {BlockRecord | DeclarationRecord | NodeEntry} */ (
        this.#entries[index]
      ).node
    );
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
    const block = /** @type {BlockRecord} */ (this.block(index));
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
   * The first live child of the block at `index`; see `blockChildren.js`.
   *
   * @param {number} index
   * @return {ChildNode | undefined}
   */
  firstLiveChild(index) {
    return firstLiveChild(this, index);
  }

  /**
   * The live children of the block at `index`, counted; see `blockChildren.js`.
   *
   * @param {number} index
   * @return {number}
   */
  liveCount(index) {
    return liveCount(this, index);
  }

  /**
   * The live entries of the block at `index`; see `blockChildren.js`.
   *
   * @param {number} index
   * @return {(RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[]}
   */
  liveEntries(index) {
    return liveEntries(this, index);
  }

  /**
   * The live children of the block at `index`; see `blockChildren.js`.
   *
   * @param {number} index
   * @return {ChildNode[]}
   */
  liveChildren(index) {
    return liveChildren(this, index);
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
    // The replacements take the chain where the record stood, which may be
    // the record itself; it is read before the record leaves the chain.
    const holder = this.links.parentOf(record);
    let after = this.links.prevSibling(record);
    this.links.unlink(record);
    for (const replacement of replacements) {
      this.links.linkAfter(holder, after, replacement);
      after = replacement;
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
    this.links.unlink(record);
    const holder = /** @type {BlockRecord} */ (this.block(target));
    const slot = new Slot(target, holder.children.length, [record]);
    holder.children.push(slot);
    this.links.linkLast(target, record);
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
      } else {
        const nested = this.blockEntry(entry);
        if (nested) {
          if (nested.dropped) continue;
          nested.parent = target;
          nested.position = holder.children.length;
        }
        holder.children.push(entry);
      }
    }
    from.children = [];
    // The chain of `source` moves whole: each entry leaves it for the end of
    // `target`, and takes `target` as its container.
    while (from.first !== -1) {
      const entry = from.first;
      this.links.unlink(entry);
      this.links.linkLast(target, entry);
    }
  }

  /**
   * Builds the record of a declaration that is a rule's child.
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
   * Builds the record of a declaration that is a child of a block and adds it
   * to the arena, which gives it the next index.
   *
   * @param {import('postcss').Declaration} node
   * @param {PropertyTable} properties the keys of the property names
   * @param {DeclarationKeys} declarations the ids of the declarations
   * @return {DeclarationRecord}
   */
  blockDeclaration(node, properties, declarations) {
    return this.#place(this.declarationRecord(node, properties, declarations));
  }

  /**
   * Adds a bare node of a block, a comment or a statement at-rule, to the
   * arena, which gives it the next index.
   *
   * @param {ChildNode} node
   * @return {NodeEntry}
   */
  bareEntry(node) {
    return this.#place(new NodeEntry(node));
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
    return this.#place(new RuleRecord(rule, rule.selectors, children));
  }
}
