import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';

/** @import {ArenaIndex} from './blockRecord.js' */

const UNLINKED_SIBLING = 'a sibling is read for an entry that is unlinked';

/**
 * The reads of the links. `BlockRecords#links` has this type, so an edit
 * reaches the links only through the arena's methods.
 *
 * @typedef {Pick<BlockLinks, 'parentOf' | 'prevSibling' | 'nextSibling' | 'firstChild' | 'lastChild' | 'childCount' | 'editedAt' | 'isEdited'>} LinkReader
 */

/**
 * The links between the entries of the records. Each entry has a container:
 * the block whose chain holds it, or for a nested block the rule that owns it.
 * A chained entry has the entries before and after it in its container's
 * chain. A container is a block, or a rule that nests. The links and the chain
 * ends are plain arrays indexed by entry, grown by `grow` as entries are added,
 * so no link is an object reference.
 */
export class BlockLinks {
  /** @type {number[]} the container of each entry, -1 when it is linked nowhere */
  #parent = [];

  /** @type {number[]} the entry before each entry in its chain, -1 at the start */
  #prev = [];

  /** @type {number[]} the entry after each entry in its chain, -1 at the end */
  #next = [];

  /** @type {number[]} the first entry of each container's chain, -1 when it holds none */
  #first = [];

  /** @type {number[]} the last entry of each container's chain, -1 when it holds none */
  #last = [];

  /** @type {number[]} the entries in each container's chain, comments included */
  #count = [];

  /** @type {number} the stamp of the last edit, which only grows */
  #clock = 0;

  /** @type {number[]} the stamp of the last edit of each container, 0 for none */
  #editedAt = [];

  /** @type {number} the clock when the build settled the links; edits after it are unsettled */
  #settledAt = 0;

  /** Gives the next entry of the arena unlinked links and an empty chain. */
  grow() {
    this.#parent.push(-1);
    this.#prev.push(-1);
    this.#next.push(-1);
    this.#first.push(-1);
    this.#last.push(-1);
    this.#count.push(0);
    this.#editedAt.push(0);
  }

  /**
   * Stamps the container with a stamp greater than every earlier one.
   *
   * @param {number} container
   * @return {void}
   */
  #stamp(container) {
    this.#editedAt[container] = ++this.#clock;
  }

  /**
   * @param {number} index an index that the arena gave, of a container
   * @return {number} the stamp of the last link or unlink of its chain, 0 for none
   */
  editedAt(index) {
    return this.#editedAt[index];
  }

  /**
   * @param {number} index an index that the arena gave, of a container
   * @return {boolean} whether its chain changed after the build settled it
   */
  isEdited(index) {
    return this.#editedAt[index] > this.#settledAt;
  }

  /** Marks every edit so far as the build's, so that only later edits count. */
  settle() {
    this.#settledAt = this.#clock;
  }

  /**
   * @param {number} index an index that the arena gave
   * @return {ArenaIndex | -1} the container of the entry, -1 when it is linked nowhere
   */
  parentOf(index) {
    return /** @type {ArenaIndex | -1} */ (this.#parent[index]);
  }

  /**
   * @param {number} index an index that the arena gave, linked in a chain
   * @return {ArenaIndex | -1} the entry before `index` in its chain, -1 at the start
   * @throws {Error} under checks, when `index` is linked nowhere
   */
  prevSibling(index) {
    this.#assertLinked(index);
    return /** @type {ArenaIndex | -1} */ (this.#prev[index]);
  }

  /**
   * @param {number} index an index that the arena gave, linked in a chain
   * @return {ArenaIndex | -1} the entry after `index` in its chain, -1 at the end
   * @throws {Error} under checks, when `index` is linked nowhere
   */
  nextSibling(index) {
    this.#assertLinked(index);
    return /** @type {ArenaIndex | -1} */ (this.#next[index]);
  }

  /**
   * @param {number} index an index that the arena gave, of a container
   * @return {ArenaIndex | -1} the first entry of its chain, -1 when it has none
   */
  firstChild(index) {
    return /** @type {ArenaIndex | -1} */ (this.#first[index]);
  }

  /**
   * @param {number} index an index that the arena gave, of a container
   * @return {ArenaIndex | -1} the last entry of its chain, -1 when it has none
   */
  lastChild(index) {
    return /** @type {ArenaIndex | -1} */ (this.#last[index]);
  }

  /**
   * @param {number} index an index that the arena gave, of a container
   * @return {number} the entries in its chain, comments included
   */
  childCount(index) {
    return this.#count[index];
  }

  /**
   * Links the entry at `index` after `after` in the chain of the container at
   * `block`, which is the head when `after` is -1. The arena checks the link
   * before it calls this.
   *
   * @param {number} block
   * @param {number} after
   * @param {number} index an entry that is linked nowhere, or was unlinked
   * @return {void}
   */
  linkAfter(block, after, index) {
    const next = after === -1 ? this.#first[block] : this.#next[after];
    this.#parent[index] = block;
    this.#prev[index] = after;
    this.#next[index] = next;
    if (after === -1) this.#first[block] = index;
    else this.#next[after] = index;
    if (next === -1) this.#last[block] = index;
    else this.#prev[next] = index;
    this.#count[block]++;
    this.#stamp(block);
  }

  /**
   * Links the entry at `index` at the end of the chain of the block at `block`.
   *
   * @param {number} block
   * @param {number} index an entry that is linked nowhere, or was unlinked
   * @return {void}
   */
  linkLast(block, index) {
    this.linkAfter(block, this.#last[block], index);
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
    const prev = this.#prev[index];
    const next = this.#next[index];
    if (prev === -1) this.#first[block] = next;
    else this.#next[prev] = next;
    if (next === -1) this.#last[block] = prev;
    else this.#prev[next] = prev;
    this.#count[block]--;
    this.#stamp(block);
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
}
