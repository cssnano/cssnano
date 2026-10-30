import DeclarationScan from './declarationScan.js';
import { BlockRecord, Slot } from './blockRecords.js';
import { writeBack } from './writeBack.js';

/** @import {ChildNode, Rule} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */

/**
 * A doubly linked list lets the scan replace a merged pair in constant time.
 *
 * @typedef {{rule: Rule, slot: Slot, prev: RuleLink | null, next: RuleLink | null}} RuleLink
 */

/**
 * The rules that stand in the slots of a pair after it is merged.
 *
 * @typedef {object} Placement
 * @property {Rule[]} first replaces the earlier rule, in its slot
 * @property {Rule[]} second replaces the later rule, in its slot
 * @property {Rule[][]} [following] replaces each rule after the later one that
 * joined the merge, in its slot
 */

/**
 * Chains a link for each rule, in order, after `previous`.
 *
 * @param {RuleLink} previous
 * @param {Rule[]} rules
 * @param {Slot} slot
 * @return {RuleLink} the last link, or `previous` when there are no rules
 */
function linkAfter(previous, rules, slot) {
  let tail = previous;
  for (const rule of rules) {
    /** @type {RuleLink} */
    const link = { rule, slot, prev: tail, next: null };
    tail.next = link;
    tail = link;
  }
  return tail;
}

/**
 * Every rule of a stylesheet in stylesheet order, including rules nested in
 * other rules, rewritten in the block records and written back once.
 */
export default class RuleSequence {
  /** @type {RuleLink} a sentinel that precedes the first rule */
  head = /** @type {RuleLink} */ ({ prev: null, next: null });

  /** @type {BlockRecords} */
  #records;

  /** @type {DeclarationScan} */
  #scan = new DeclarationScan();

  /** @type {Set<BlockRecord>} blocks whose children differ from the stylesheet */
  #changed = new Set();

  /** @type {BlockRecord[]} droppable blocks tracked by this sweep */
  #tracked = [];

  /** @param {BlockRecords} records */
  constructor(records) {
    this.#records = records;
    let tail = this.head;
    /** @param {BlockRecord} block */
    const collect = (block) => {
      let live = 0;
      for (const entry of block.children) {
        if (entry instanceof Slot) {
          for (const rule of entry.rules) {
            /** @type {RuleLink} */
            const link = { rule, slot: entry, prev: tail, next: null };
            tail.next = link;
            tail = link;
            live++;
            const nested = records.metaOf(rule).block;
            if (nested) collect(nested);
          }
        } else if (entry instanceof BlockRecord) {
          if (entry.dropped) continue;
          live++;
          collect(entry);
        } else {
          live++;
        }
      }
      block.remaining = null;
      if (block.droppable && live > 0) {
        block.remaining = live;
        this.#tracked.push(block);
      }
    };
    collect(records.root);
  }

  /**
   * @param {RuleLink} first
   * @param {RuleLink} second
   * @param {WeakMap<BlockRecord, boolean>} outsideDeclarations see
   * `DeclarationScan#declarationBetween`
   * @return {boolean} whether a declaration outside both rules lies between them
   */
  declarationBetween(first, second, outsideDeclarations) {
    return this.#scan.declarationBetween(first, second, outsideDeclarations);
  }

  /**
   * Moves the rule of `second` to the end of the parent of `first`. It follows
   * `first` and holds no nested rules, so passing the rest of that parent
   * leaves the order of the rules unchanged.
   *
   * @param {RuleLink} first
   * @param {RuleLink} second
   * @return {boolean} whether the parents differed
   */
  moveIntoParent(first, second) {
    const target = first.slot.block;
    const source = second.slot.block;
    if (target === source) return false;
    source.changed(-1);
    target.changed(1);
    second.slot = target.moveRule(second.rule, second.slot, this.#records);
    this.#changed.add(target).add(source);
    return true;
  }

  /**
   * Replaces the pair `first` and the link after it, and the links after
   * those that joined, with the `placement` rules.
   *
   * @param {RuleLink} first
   * @param {Placement} placement
   * @return {RuleLink} the link of the first replacement
   */
  replacePair(first, placement) {
    const second = /** @type {RuleLink} */ (first.next);
    const before = /** @type {RuleLink} */ (first.prev);
    const after = second.next;
    const firstSlot = first.slot;
    const secondSlot = second.slot;
    // Both rules may share a slot after an earlier partial merge, so each is
    // replaced where it stands.
    firstSlot.block.changed(placement.first.length - 1);
    secondSlot.block.changed(placement.second.length - 1);
    firstSlot.substitute(first.rule, placement.first, this.#records);
    secondSlot.substitute(second.rule, placement.second, this.#records);
    this.#changed.add(firstSlot.block).add(secondSlot.block);

    let tail = linkAfter(
      linkAfter(before, placement.first, firstSlot),
      placement.second,
      secondSlot
    );
    let following = after;
    for (const rules of placement.following ?? []) {
      const link = /** @type {RuleLink} */ (following);
      following = link.next;
      link.slot.block.changed(rules.length - 1);
      link.slot.substitute(link.rule, rules, this.#records);
      tail = linkAfter(tail, rules, link.slot);
    }
    tail.next = following;
    if (following) following.prev = tail;
    return /** @type {RuleLink} */ (before.next);
  }

  /**
   * Writes the sequence into the stylesheet, rebuilding each changed container
   * once from its records.
   *
   * @return {void}
   */
  write() {
    // A block which has become empty can be safely ignored, but keeping it would
    // make every later pair walk across it. Rebuild its parent without it,
    // which avoids searching the children of the parent once per removed
    // block.
    /** @type {Set<BlockRecord>} */
    const emptied = new Set();
    for (const block of this.#tracked) {
      if (block.remaining === 0) emptied.add(block);
    }
    for (const block of emptied) block.dropped = true;
    const changed = new Set(this.#changed);
    for (const block of emptied) {
      const parent = /** @type {BlockRecord} */ (block.parent);
      if (!emptied.has(parent)) changed.add(parent);
      changed.delete(block);
    }
    writeBack(changed);
  }
}
