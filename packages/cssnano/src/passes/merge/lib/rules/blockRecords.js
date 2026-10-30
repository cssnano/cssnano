/** @import {ChildNode, Container, Rule} from 'postcss' */
import { RuleRecord, isDeclaration } from './ruleRecord.js';

/**
 * One position among the children of a block. `rules` are the rules that
 * stand there now, in order, so the slot is empty once every rule left.
 */
export class Slot {
  /** @type {BlockRecord} the block the slot stands in */
  block;

  /** @type {number} where the slot stands among the children of `block` */
  position;

  /** @type {RuleRecord[]} */
  rules;

  /**
   * @param {BlockRecord} block
   * @param {number} position
   * @param {RuleRecord[]} rules
   */
  constructor(block, position, rules) {
    this.block = block;
    this.position = position;
    this.rules = rules;
  }

  /**
   * Replaces `record` in the slot with `replacements`, and places each of them
   * here.
   *
   * @param {RuleRecord} record the record that stands in the slot and is replaced
   * @param {RuleRecord[]} replacements
   * @return {void}
   */
  substitute(record, replacements) {
    this.rules.splice(this.rules.indexOf(record), 1, ...replacements);
    for (const replacement of replacements) replacement.place(this);
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

  /**
   * The whitespace before the first child of the stylesheet, which PostCSS
   * hands on when that child is removed. Only the record of the stylesheet
   * holds it.
   *
   * @type {string | undefined}
   */
  leadingWhitespace = undefined;

  /**
   * Where the first live entry stood when last looked up. A dead entry never
   * becomes live again, so the lookup resumes here rather than at the start.
   *
   * @type {number}
   */
  #firstLive = 0;

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
   * The first child the block holds now, without copying the child list.
   *
   * @return {ChildNode | undefined}
   */
  firstLiveChild() {
    const { children } = this;
    for (; this.#firstLive < children.length; this.#firstLive++) {
      const entry = children[this.#firstLive];
      if (entry instanceof Slot) {
        if (entry.rules.length > 0) return entry.rules[0].node;
      } else if (entry instanceof BlockRecord) {
        if (!entry.dropped) return /** @type {ChildNode} */ (entry.node);
      } else {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * The number of children the block holds now, counted without copying them.
   *
   * @return {number}
   */
  liveCount() {
    let count = 0;
    for (const entry of this.children) {
      if (entry instanceof Slot) {
        count += entry.rules.length;
      } else if (!(entry instanceof BlockRecord && entry.dropped)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Accounts for the block gaining `change` live children, or losing them when
   * negative. A droppable block that is tracked and goes empty tells its
   * parent, which may go empty in turn.
   *
   * @param {number} change
   * @return {void}
   */
  changed(change) {
    const count = this.remaining;
    if (count === null) return;
    this.remaining = count + change;
    // A block already empty has told its parent; telling it again would
    // undercount the parent.
    if (count > 0 && count + change === 0) this.#climb();
  }

  /**
   * Tells the parent of a block that just lost its last child. Only a
   * droppable parent is climbed to: a style rule or any other at-rule stays.
   *
   * @return {void}
   */
  #climb() {
    const parent = this.parent;
    if (!parent || !parent.droppable) return;
    const known = parent.remaining;
    // A parent that is empty in the source is not tracked, and holds no child.
    if (known === null) return;
    parent.remaining = known - 1;
    if (known === 1) parent.#climb();
  }

  /**
   * The children the block holds now, in order: the rules of its slots, and
   * the nodes of its other entries, except a block that was dropped.
   *
   * @return {ChildNode[]}
   */
  liveChildren() {
    /** @type {ChildNode[]} */
    const children = [];
    for (const entry of this.children) {
      if (entry instanceof Slot) {
        for (const record of entry.rules) children.push(record.node);
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
   * Moves `record` out of `from` into a new slot after the last child of this
   * block.
   *
   * @param {RuleRecord} record
   * @param {Slot} from
   * @return {Slot} the slot that now holds `record`
   */
  moveRule(record, from) {
    from.rules.splice(from.rules.indexOf(record), 1);
    const slot = new Slot(this, this.children.length, [record]);
    this.children.push(slot);
    record.place(slot);
    return slot;
  }

  /**
   * Takes the children of `source` after its own. Each rule gets a slot here,
   * and each block a rule holds gets this block as its parent. `source` is
   * left with no children, since the caller removes it.
   *
   * @param {BlockRecord} source
   * @return {void}
   */
  adopt(source) {
    for (const entry of source.children) {
      if (entry instanceof Slot) {
        if (entry.rules.length === 0) continue;
        const slot = new Slot(this, this.children.length, entry.rules);
        for (const record of entry.rules) {
          record.place(slot);
          if (record.block) {
            record.block.parent = this;
            record.block.position = slot.position;
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
 * Under consistency checks, throws when a record names other declarations than
 * its rule holds.
 *
 * @param {Rule} rule
 * @param {RuleRecord} record
 * @return {void}
 */
export function assertDeclarationsFresh(rule, record) {
  const kept = record.declarations;
  const fresh = rule.nodes.filter(isDeclaration);
  const same =
    kept.length === fresh.length && kept.every((node, i) => node === fresh[i]);
  if (!same) throw new Error('stale declarations of a rule record');
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

  /** @type {Map<Rule, RuleRecord>} the record of each rule, by rule */
  #metas = new Map();

  /** @type {Map<string, number> | null} declarations the input wrote, under checks */
  inputWrites = null;

  /**
   * The most rounds a run may take before it throws. Set from the counts of
   * rules, at-rules and declarations when the records are built.
   *
   * @type {number}
   */
  maxRounds = Infinity;

  /** @param {BlockRecord} root the record of the stylesheet */
  constructor(root) {
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
   * The records of every block the run added, dropped ones included.
   *
   * @return {IterableIterator<BlockRecord>}
   */
  blocks() {
    return this.#blocks.values();
  }

  /**
   * Gives a rule its record, built from its current declarations.
   *
   * @param {Rule} rule
   * @return {RuleRecord}
   */
  recordRule(rule) {
    const record = new RuleRecord(
      rule,
      rule.selectors,
      rule.nodes.filter(isDeclaration)
    );
    this.#metas.set(rule, record);
    return record;
  }

  /**
   * The entry a live child of a block stands as: the record of a rule, the
   * record of an at-rule with a block, or the node itself.
   *
   * @param {ChildNode} node
   * @return {RuleRecord | BlockRecord | ChildNode}
   */
  entryOf(node) {
    if (node.type === 'rule') return this.metaOf(node);
    if (node.type === 'atrule') return this.#blocks.get(node) ?? node;
    return node;
  }

  /** @param {Rule} rule @return {RuleRecord | undefined} */
  recordOf(rule) {
    return this.#metas.get(rule);
  }

  /**
   * @param {Rule} rule
   * @return {RuleRecord}
   * @throws {Error} when the rule has no record
   */
  metaOf(rule) {
    const record = this.#metas.get(rule);
    if (record === undefined)
      throw new Error('read of a rule without a record');
    return record;
  }
}
