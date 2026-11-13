import { AT_RULE_BLOCK, RULE, STYLESHEET } from '../../../ir/blockRecord.js';
import { moveRule, substitute } from '../../../ir/arenaEdits.js';
import { remove } from '../../../ir/treeEdits.js';

/** @import {ArenaIndex, BlockRecord} from '../../../ir/blockRecord.js' */
/** @import {RuleRecord} from '../../../ir/ruleRecord.js' */
/** @import {BlockRecords} from '../../../ir/blockRecords.js' */

/**
 * The rules that stand in the slots of a pair after it is merged.
 *
 * @typedef {object} Placement
 * @property {ArenaIndex[]} first the indices of the rules that replace the earlier
 * rule, in its slot
 * @property {ArenaIndex[]} second the indices of the rules that replace the later
 * rule, in its slot
 * @property {ArenaIndex[][]} [following] the indices of the rules that replace each
 * rule after the later one that joined the merge, in its slot
 */

/**
 * Every rule of a stylesheet in stylesheet order, including rules nested in
 * other rules, rewritten in the block records. The order is two arrays indexed
 * by rule: each rule names the rule before it and the rule after it, with -1 at
 * either end. A rule made during the sweep takes an index past the arrays,
 * which they grow to hold. The methods that edit the records take them as an
 * argument; the sequence keeps no reference to them.
 */
export default class RuleSequence {
  /** @type {(ArenaIndex | -1)[]} the index of the rule before each rule, -1 at the start */
  #prev;

  /** @type {(ArenaIndex | -1)[]} the index of the rule after each rule, -1 at the end */
  #next;

  /** @type {ArenaIndex | -1} the index of the first rule, -1 when there is none */
  head = -1;

  /** @type {ArenaIndex | -1} the index of the last rule linked so far, -1 before the first */
  #tail = -1;

  /** @param {BlockRecords} records */
  constructor(records) {
    this.#prev = [];
    this.#next = [];
    this.#reserve(records.entryCount() - 1);
    this.#collect(records, records.root);
  }

  /**
   * Links the rules under `block` in document order, after the rules already
   * linked.
   *
   * @param {BlockRecords} records
   * @param {BlockRecord | RuleRecord} block the block, or the rule that nests
   * @return {void}
   */
  #collect(records, block) {
    const { links } = records;
    for (
      let entry = links.firstChild(block.index);
      entry !== -1;
      entry = links.nextSibling(entry)
    ) {
      const item = records.entry(entry);
      if (item.kind === RULE) {
        this.#tail = this.#link(this.#tail, entry);
        if (item.context !== -1) this.#collect(records, item);
      } else if (item.kind === STYLESHEET || item.kind === AT_RULE_BLOCK) {
        this.#collect(records, item);
      }
    }
  }

  /**
   * @param {ArenaIndex | -1} index
   * @return {ArenaIndex | -1} the index of the rule after the rule at `index`, -1 at the end
   */
  nextOf(index) {
    return index === -1 ? -1 : this.#next[index];
  }

  /**
   * @param {ArenaIndex | -1} index
   * @return {ArenaIndex | -1} the index of the rule before the rule at `index`, -1 at the start
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
   * @param {ArenaIndex | -1} previous
   * @param {ArenaIndex} index
   * @return {ArenaIndex} `index`
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
   * @param {ArenaIndex | -1} previous
   * @param {ArenaIndex[]} indices
   * @return {ArenaIndex | -1} the last rule linked, or `previous` when there are none
   */
  #linkAll(previous, indices) {
    let tail = previous;
    for (const index of indices) tail = this.#link(tail, index);
    return tail;
  }

  /**
   * Moves the rule at `second` to the end of the parent of the rule at `first`.
   * It follows `first` and holds no nested rules, so passing the rest of that
   * parent leaves the order of the rules unchanged.
   *
   * @param {BlockRecords} records
   * @param {ArenaIndex} first
   * @param {ArenaIndex} second
   * @return {boolean} whether the parents differed
   */
  moveIntoParent(records, first, second) {
    const target = records.links.parentOf(first);
    const source = records.links.parentOf(second);
    if (target === source) return false;
    // The first of the pair is linked, so its container is an index.
    moveRule(records, /** @type {ArenaIndex} */ (target), second);
    // The sweep retries a moved pair, so a move that leaves the parents
    // apart would repeat forever; it throws instead.
    if (records.links.parentOf(second) !== records.links.parentOf(first)) {
      throw new Error('a moved rule is still outside the parent it joined');
    }
    this.#dropIfEmptied(records, source);
    return true;
  }

  /**
   * Replaces the pair at `first` and the rule after it, and the rules after
   * those that joined, with the `placement` rules.
   *
   * @param {BlockRecords} records
   * @param {ArenaIndex} first
   * @param {Placement} placement
   * @return {ArenaIndex | -1} the index of the first replacement
   */
  replacePair(records, first, placement) {
    // The pair and the rules that follow it are linked, so each is an index.
    const second = /** @type {ArenaIndex} */ (this.#next[first]);
    const before = this.#prev[first];
    const after = this.#next[second];
    this.#substitute(records, first, placement.first);
    this.#substitute(records, second, placement.second);

    let tail = this.#linkAll(
      this.#linkAll(before, placement.first),
      placement.second
    );
    let following = after;
    for (const rules of placement.following ?? []) {
      const index = /** @type {ArenaIndex} */ (following);
      following = this.#next[index];
      this.#substitute(records, index, rules);
      tail = this.#linkAll(tail, rules);
    }
    if (tail === -1) this.head = following;
    else this.#next[tail] = following;
    if (following !== -1) this.#prev[following] = tail;
    return before === -1 ? this.head : this.#next[before];
  }

  /**
   * Replaces the rule `index` with `rules`, then unlinks the block that the
   * replacement left empty.
   *
   * @param {BlockRecords} records
   * @param {ArenaIndex} index
   * @param {ArenaIndex[]} rules
   * @return {void}
   */
  #substitute(records, index, rules) {
    const holder = records.links.parentOf(index);
    substitute(records, index, rules);
    this.#dropIfEmptied(records, holder);
  }

  /**
   * Unlinks the droppable block at `index` once an edit has emptied it, then
   * the droppable block that holds it, if that one is empty in turn. A block
   * that holds nothing at the start of the sweep is never emptied by an edit,
   * so it stays.
   *
   * @param {BlockRecords} records
   * @param {ArenaIndex | -1} index
   * @return {void}
   */
  #dropIfEmptied(records, index) {
    const { links } = records;
    let at = index;
    for (;;) {
      // A rule that nests is never dropped, so the climb stops at it.
      const block = records.blockEntry(at);
      if (at === -1 || !block?.droppable || links.childCount(at) !== 0) return;
      const holder = links.parentOf(at);
      remove(records, at);
      if (holder === -1) return;
      at = holder;
    }
  }
}
