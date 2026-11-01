/** @import {BlockRecord} from './blockRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */
import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { RuleRecord } from './ruleRecord.js';

const DETACHED_BLOCK = 'an entry is linked into a block outside the tree';
const UNLINKED_SIBLING = 'a sibling is read for an entry that is unlinked';

/**
 * The links between the entries of the records. Each entry has a container:
 * the block whose chain holds it, or for a nested block the rule that owns it.
 * A chained entry has the entries before and after it in its container's
 * chain, and the chain's ends are `first` and `last` on the block record. The
 * links are plain arrays indexed by entry, grown by `grow` as entries are
 * added, so no link is an object reference.
 */
export class BlockLinks {
  /** @type {BlockRecords} the arena whose block records hold the chain ends */
  #records;

  /** @type {number[]} the container of each entry, -1 when it is linked nowhere */
  #parent = [];

  /** @type {number[]} the entry before each entry in its chain, -1 at the start */
  #prev = [];

  /** @type {number[]} the entry after each entry in its chain, -1 at the end */
  #next = [];

  /** @param {BlockRecords} records the arena whose entries these links join */
  constructor(records) {
    this.#records = records;
  }

  /** Gives the next entry of the arena unlinked links. */
  grow() {
    this.#parent.push(-1);
    this.#prev.push(-1);
    this.#next.push(-1);
  }

  /**
   * The block whose chain holds the entry at `index`. A nested block is linked
   * to the rule that owns it, so the walk steps through that rule.
   *
   * @param {number} index an index that the arena gave
   * @return {BlockRecord | undefined} undefined for the stylesheet
   */
  enclosingBlock(index) {
    let holder = this.#parent[index];
    if (holder !== -1 && this.#records.entry(holder) instanceof RuleRecord) {
      holder = this.#parent[holder];
    }
    return this.#records.block(holder);
  }

  /**
   * @param {number} index an index that the arena gave
   * @return {number} the container of the entry, -1 when it is linked nowhere
   */
  parentOf(index) {
    return this.#parent[index];
  }

  /**
   * @param {number} index an index that the arena gave, linked in a chain
   * @return {number} the entry before `index` in its chain, -1 at the start
   * @throws {Error} under checks, when `index` is linked nowhere
   */
  prevSibling(index) {
    this.#assertLinked(index);
    return this.#prev[index];
  }

  /**
   * @param {number} index an index that the arena gave, linked in a chain
   * @return {number} the entry after `index` in its chain, -1 at the end
   * @throws {Error} under checks, when `index` is linked nowhere
   */
  nextSibling(index) {
    this.#assertLinked(index);
    return this.#next[index];
  }

  /**
   * @param {number} index an index that the arena gave, of a block
   * @return {number} the first entry of its chain, -1 when it has none
   */
  firstChild(index) {
    return /** @type {BlockRecord} */ (this.#records.block(index)).first;
  }

  /**
   * @param {number} index an index that the arena gave, of a block
   * @return {number} the last entry of its chain, -1 when it has none
   */
  lastChild(index) {
    return /** @type {BlockRecord} */ (this.#records.block(index)).last;
  }

  /**
   * Makes the rule at `rule` the container of the nested block at `block`. The
   * nested block is linked nowhere: its children are the rule's.
   *
   * @param {number} rule
   * @param {number} block
   * @return {void}
   */
  ownBlock(rule, block) {
    this.#parent[block] = rule;
  }

  /**
   * Links the entry at `index` after `after` in the chain of the block at
   * `block`, which is the head when `after` is -1. Under checks, a block that
   * does not reach the root through `parentOf` throws, since its entries would
   * be lost.
   *
   * @param {number} block
   * @param {number} after
   * @param {number} index an entry that is linked nowhere, or was unlinked
   * @return {void}
   */
  linkAfter(block, after, index) {
    if (consistencyChecksEnabled()) this.#assertReachesRoot(block);
    const holder = /** @type {BlockRecord} */ (this.#records.block(block));
    const next = after === -1 ? holder.first : this.#next[after];
    this.#parent[index] = block;
    this.#prev[index] = after;
    this.#next[index] = next;
    if (after === -1) holder.first = index;
    else this.#next[after] = index;
    if (next === -1) holder.last = index;
    else this.#prev[next] = index;
    holder.count++;
  }

  /**
   * Links the entry at `index` at the end of the chain of the block at `block`.
   *
   * @param {number} block
   * @param {number} index an entry that is linked nowhere, or was unlinked
   * @return {void}
   */
  linkLast(block, index) {
    this.linkAfter(
      block,
      /** @type {BlockRecord} */ (this.#records.block(block)).last,
      index
    );
  }

  /**
   * Takes the entry at `index` out of its chain. The entry keeps its own
   * subtree, and a later link may place it again.
   *
   * @param {number} index
   * @return {void}
   */
  unlink(index) {
    const block = this.#parent[index];
    if (block === -1) return;
    const holder = /** @type {BlockRecord} */ (this.#records.block(block));
    const prev = this.#prev[index];
    const next = this.#next[index];
    if (prev === -1) holder.first = next;
    else this.#next[prev] = next;
    if (next === -1) holder.last = prev;
    else this.#prev[next] = prev;
    holder.count--;
    this.#parent[index] = -1;
    this.#prev[index] = -1;
    this.#next[index] = -1;
  }

  /**
   * Puts the entry `earlier` in the chain where `later` stands, and unlinks
   * `later`.
   *
   * @param {number} later a linked entry
   * @param {number} earlier an entry that is linked elsewhere, or nowhere
   * @return {void}
   */
  takeLinkOf(later, earlier) {
    this.unlink(earlier);
    // The unlink above may have been the entry before `later`, so the
    // neighbour is read after it.
    this.linkAfter(this.#parent[later], this.#prev[later], earlier);
    this.unlink(later);
  }

  /**
   * @param {number} index
   * @return {void}
   * @throws {Error} under checks, when `index` is linked nowhere
   */
  #assertLinked(index) {
    if (consistencyChecksEnabled() && this.#parent[index] === -1) {
      throw new Error(UNLINKED_SIBLING);
    }
  }

  /**
   * @param {number} block
   * @return {void}
   * @throws {Error} when a walk up `parentOf` from `block` does not reach the root
   */
  #assertReachesRoot(block) {
    let at = block;
    while (at !== this.#records.root.index) {
      at = this.#parent[at];
      if (at === -1) throw new Error(DETACHED_BLOCK);
    }
  }
}
