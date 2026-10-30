import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';

/** @import {ChildNode, Container, Rule} from 'postcss' */
import { RuleMeta, isDeclaration } from './ruleMeta.js';

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

  /**
   * Replaces `rule` in the slot with `replacements`, and places each of them
   * here.
   *
   * @param {Rule} rule the rule that stands in the slot and is replaced
   * @param {Rule[]} replacements
   * @param {BlockRecords} records
   * @return {void}
   */
  substitute(rule, replacements, records) {
    this.rules.splice(this.rules.indexOf(rule), 1, ...replacements);
    for (const replacement of replacements) {
      records.metaOf(replacement).place(this);
    }
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
    for (const entry of this.children) {
      if (entry instanceof Slot) {
        if (entry.rules.length > 0) return entry.rules[0];
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
   * Moves `rule` out of `from` into a new slot after the last child of this
   * block.
   *
   * @param {Rule} rule
   * @param {Slot} from
   * @param {BlockRecords} records
   * @return {Slot} the slot that now holds `rule`
   */
  moveRule(rule, from, records) {
    from.rules.splice(from.rules.indexOf(rule), 1);
    const slot = new Slot(this, this.children.length, [rule]);
    this.children.push(slot);
    records.metaOf(rule).place(slot);
    return slot;
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
 * @param {Rule} rule
 * @return {number} the declarations the rule holds, without copying them
 */
export function countDeclarations(rule) {
  let count = 0;
  for (const node of rule.nodes) {
    if (node.type === 'decl') count++;
  }
  return count;
}

const POTENTIAL =
  'a sweep raised its potential, or moved a rule without lowering it';

/**
 * The potential that a sweep never raises: the declarations of the live rules
 * that hold no block, then those rules, then the sum over them of the number
 * of the block each stands in. Blocks are numbered in document order, dropped
 * ones included, and nothing is stored between calls.
 *
 * @param {BlockRecords} records
 * @return {[number, number, number]}
 */
export function sweepPotential(records) {
  let declarations = 0;
  let rules = 0;
  let parents = 0;
  let number = 0;
  /** @param {BlockRecord} block */
  const visit = (block) => {
    const id = number++;
    for (const entry of block.children) {
      if (entry instanceof Slot) {
        for (const rule of entry.rules) {
          const nested = records.metaOf(rule).block;
          if (nested) {
            visit(nested);
          } else {
            declarations += countDeclarations(rule);
            rules++;
            parents += id;
          }
        }
      } else if (entry instanceof BlockRecord) {
        visit(entry);
      }
    }
  };
  visit(records.root);
  return [declarations, rules, parents];
}

/**
 * Under consistency checks, throws when a sweep raised the potential, or moved
 * a rule and left the potential equal. A move lowers the parent count because
 * `sameContainer` matches whole ancestor chains, so neither parent contains
 * the other and the earlier parent comes first in document order.
 *
 * @param {[number, number, number]} before
 * @param {[number, number, number]} after
 * @param {boolean} moved whether the sweep moved a rule to another parent
 * @return {void}
 */
export function assertSweepLowers(before, after, moved) {
  if (!consistencyChecksEnabled()) return;
  let change = 0;
  for (let index = 0; index < before.length && change === 0; index++) {
    change = after[index] - before[index];
  }
  if (change > 0 || (moved && change === 0)) throw new Error(POTENTIAL);
}

/**
 * Under consistency checks, throws when a record names other declarations than
 * its rule holds.
 *
 * @param {Rule} rule
 * @param {RuleMeta} meta
 * @return {void}
 */
export function assertDeclarationsFresh(rule, meta) {
  const kept = meta.declarations;
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

  /** @type {Map<Rule, RuleMeta>} the record of each rule, by rule */
  #metas = new Map();

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
   * Gives a rule its record, built from its current declarations.
   *
   * @param {Rule} rule
   * @return {RuleMeta}
   */
  recordRule(rule) {
    const meta = new RuleMeta(rule.selectors, rule.nodes.filter(isDeclaration));
    this.#metas.set(rule, meta);
    return meta;
  }

  /** @param {Rule} rule @return {RuleMeta | undefined} */
  recordOf(rule) {
    return this.#metas.get(rule);
  }

  /**
   * @param {Rule} rule
   * @return {RuleMeta}
   * @throws {Error} when the rule has no record
   */
  metaOf(rule) {
    const meta = this.#metas.get(rule);
    if (meta === undefined) throw new Error('read of a rule without a record');
    return meta;
  }
}
