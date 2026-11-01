import DeclarationScan from './declarationScan.js';
import { BlockRecord } from './blockRecord.js';
import { RuleRecord } from './ruleRecord.js';

/** @import {BlockRecords, Slot} from './blockRecords.js' */

/**
 * The rules that stand in the slots of a pair after it is merged.
 *
 * @typedef {object} Placement
 * @property {number[]} first the indices of the rules that replace the earlier
 * rule, in its slot
 * @property {number[]} second the indices of the rules that replace the later
 * rule, in its slot
 * @property {number[][]} [following] the indices of the rules that replace each
 * rule after the later one that joined the merge, in its slot
 */

/**
 * Every rule of a stylesheet in stylesheet order, including rules nested in
 * other rules, rewritten in the block records. The order is two arrays indexed
 * by rule: each rule names the rule before it and the rule after it, with -1 at
 * either end. A rule made during the sweep takes an index past the arrays,
 * which they grow to hold.
 */
export default class RuleSequence {
  /** @type {BlockRecords} */
  #records;

  /** @type {number[]} the index of the rule before each rule, -1 at the start */
  #prev;

  /** @type {number[]} the index of the rule after each rule, -1 at the end */
  #next;

  /** @type {number} the index of the first rule, -1 when there is none */
  head = -1;

  /** @type {DeclarationScan} */
  #scan;

  /** @type {number} the index of the last rule linked so far, -1 before the first */
  #tail = -1;

  /** @param {BlockRecords} records */
  constructor(records) {
    this.#records = records;
    this.#scan = new DeclarationScan(records);
    this.#prev = [];
    this.#next = [];
    this.#reserve(records.entryCount() - 1);
    this.#collect(records.root);
  }

  /**
   * Links the rules under `block` in document order, after the rules already
   * linked.
   *
   * @param {BlockRecord} block
   * @return {void}
   */
  #collect(block) {
    const { links } = this.#records;
    for (
      let entry = links.firstChild(block.index);
      entry !== -1;
      entry = links.nextSibling(entry)
    ) {
      const item = this.#records.entry(entry);
      if (item instanceof RuleRecord) {
        this.#tail = this.#link(this.#tail, entry);
        if (item.block !== -1) {
          this.#collect(
            /** @type {BlockRecord} */ (this.#records.block(item.block))
          );
        }
      } else if (item instanceof BlockRecord) {
        this.#collect(item);
      }
    }
  }

  /**
   * @param {number} index
   * @return {number} the index of the rule after the rule at `index`, -1 at the end
   */
  nextOf(index) {
    return index === -1 ? -1 : this.#next[index];
  }

  /**
   * @param {number} index
   * @return {number} the index of the rule before the rule at `index`, -1 at the start
   */
  prevOf(index) {
    return index === -1 ? -1 : this.#prev[index];
  }

  /**
   * Grows the arrays to hold the rule at `index`, so no array has holes for the
   * rules a rewrite made and never linked.
   *
   * @param {number} index
   * @return {void}
   */
  #reserve(index) {
    for (let at = this.#prev.length; at <= index; at++) {
      this.#prev.push(-1);
      this.#next.push(-1);
    }
  }

  /**
   * Links the rule at `index` after the rule at `previous`, or makes it the head
   * when `previous` is -1. Its own link to the rule after it is reset, so the
   * caller links that next.
   *
   * @param {number} previous
   * @param {number} index
   * @return {number} `index`
   */
  #link(previous, index) {
    this.#reserve(index);
    this.#prev[index] = previous;
    this.#next[index] = -1;
    if (previous === -1) this.head = index;
    else this.#next[previous] = index;
    return index;
  }

  /**
   * Links each rule of `indices` in order after `previous`.
   *
   * @param {number} previous
   * @param {number[]} indices
   * @return {number} the last rule linked, or `previous` when there are none
   */
  #linkAll(previous, indices) {
    let tail = previous;
    for (const index of indices) tail = this.#link(tail, index);
    return tail;
  }

  /**
   * @param {RuleRecord} first
   * @param {RuleRecord} second
   * @param {Map<number, boolean>} outsideDeclarations see
   * `DeclarationScan#declarationBetween`
   * @return {boolean} whether a declaration outside both rules lies between them
   */
  declarationBetween(first, second, outsideDeclarations) {
    return this.#scan.declarationBetween(first, second, outsideDeclarations);
  }

  /**
   * Moves the rule at `second` to the end of the parent of the rule at `first`.
   * It follows `first` and holds no nested rules, so passing the rest of that
   * parent leaves the order of the rules unchanged.
   *
   * @param {number} first
   * @param {number} second
   * @return {boolean} whether the parents differed
   */
  moveIntoParent(first, second) {
    const records = this.#records;
    const target = /** @type {RuleRecord} */ (records.rule(first)).slotBlock;
    const source = /** @type {RuleRecord} */ (records.rule(second)).slotBlock;
    if (target === source) return false;
    records.moveRule(target, second);
    // The sweep retries a moved pair, so a move that leaves the parents
    // apart would repeat forever; it throws instead.
    if (
      /** @type {RuleRecord} */ (records.rule(second)).slotBlock !==
      /** @type {RuleRecord} */ (records.rule(first)).slotBlock
    ) {
      throw new Error('a moved rule is still outside the parent it joined');
    }
    this.#dropIfEmptied(source);
    return true;
  }

  /**
   * Replaces the pair at `first` and the rule after it, and the rules after
   * those that joined, with the `placement` rules.
   *
   * @param {number} first
   * @param {Placement} placement
   * @return {number} the index of the first replacement
   */
  replacePair(first, placement) {
    const records = this.#records;
    const second = this.#next[first];
    const before = this.#prev[first];
    const after = this.#next[second];
    const firstSlot = records.slotOf(
      /** @type {RuleRecord} */ (records.rule(first))
    );
    const secondSlot = records.slotOf(
      /** @type {RuleRecord} */ (records.rule(second))
    );
    // Both rules may share a slot after an earlier partial merge, so each is
    // replaced where it stands.
    this.#substitute(firstSlot, first, placement.first);
    this.#substitute(secondSlot, second, placement.second);

    let tail = this.#linkAll(
      this.#linkAll(before, placement.first),
      placement.second
    );
    let following = after;
    for (const rules of placement.following ?? []) {
      const index = following;
      following = this.#next[index];
      const slot = records.slotOf(
        /** @type {RuleRecord} */ (records.rule(index))
      );
      this.#substitute(slot, index, rules);
      tail = this.#linkAll(tail, rules);
    }
    if (tail === -1) this.head = following;
    else this.#next[tail] = following;
    if (following !== -1) this.#prev[following] = tail;
    return before === -1 ? this.head : this.#next[before];
  }

  /**
   * Replaces the rule `index` in `slot` with `rules`, then unlinks the block
   * that the replacement left empty.
   *
   * @param {Slot} slot
   * @param {number} index
   * @param {number[]} rules
   * @return {void}
   */
  #substitute(slot, index, rules) {
    this.#records.substitute(slot, index, rules);
    this.#dropIfEmptied(slot.block);
  }

  /**
   * Unlinks the droppable block at `index` once an edit has emptied it, then
   * the droppable block that holds it, if that one is empty in turn. A block
   * that holds nothing at the start of the sweep is never emptied by an edit,
   * so it stays.
   *
   * @param {number} index
   * @return {void}
   */
  #dropIfEmptied(index) {
    const { links } = this.#records;
    let at = index;
    for (;;) {
      const block = /** @type {BlockRecord} */ (this.#records.block(at));
      if (!block.droppable || block.count !== 0) return;
      const holder = links.parentOf(at);
      links.unlink(at);
      if (holder === -1) return;
      at = holder;
    }
  }
}
