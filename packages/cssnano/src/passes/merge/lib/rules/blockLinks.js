import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { BlockRecord, NodeEntry } from './blockRecord.js';
import { RuleRecord } from './ruleRecord.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';

/** @import {BlockRecords} from './blockRecords.js' */

const DETACHED_BLOCK = 'an entry is linked into a block outside the tree';
const UNLINKED_SIBLING = 'a sibling is read for an entry that is unlinked';
const PLAIN_RULE =
  'a rule or an at-rule is linked into a rule that holds no rules';
const NOT_REACHED = 'a rule is read that the root does not reach';

/**
 * The links between the entries of the records. Each entry has a container:
 * the block whose chain holds it, or for a nested block the rule that owns it.
 * A chained entry has the entries before and after it in its container's
 * chain, and the chain's ends are `first` and `last` on the container's record.
 * A container is a block, or a rule that nests. The links are plain arrays
 * indexed by entry, grown by `grow` as entries are added, so no link is an
 * object reference.
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
   * The container whose chain holds the entry at `index`.
   *
   * @param {number} index an index that the arena gave
   * @return {BlockRecord | RuleRecord | undefined} undefined when the entry is linked nowhere
   */
  enclosingContainer(index) {
    return this.#records.container(this.#parent[index]);
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
   * @param {number} index an index that the arena gave, of a container
   * @return {number} the first entry of its chain, -1 when it has none
   */
  firstChild(index) {
    return this.#containerAt(index).first;
  }

  /**
   * @param {number} index an index that the arena gave, of a container
   * @return {number} the last entry of its chain, -1 when it has none
   */
  lastChild(index) {
    return this.#containerAt(index).last;
  }

  /**
   * @param {number} index an index that the arena gave, of a container
   * @return {DeclarationRecord | undefined} the first declaration of its chain
   */
  firstDeclaration(index) {
    return this.#declarationFrom(this.firstChild(index));
  }

  /**
   * @param {DeclarationRecord} declaration a declaration linked in a chain
   * @return {DeclarationRecord | undefined} the declaration after it in its chain
   * @throws {Error} under checks, when the declaration is linked nowhere
   */
  nextDeclaration(declaration) {
    return this.#declarationFrom(this.nextSibling(declaration.index));
  }

  /**
   * @param {number} index the entry to start from, or -1
   * @return {DeclarationRecord | undefined} the first declaration at or after `index`
   */
  #declarationFrom(index) {
    for (let at = index; at !== -1; at = this.#next[at]) {
      const entry = this.#records.entry(at);
      if (entry instanceof DeclarationRecord) return entry;
    }
    return undefined;
  }

  /**
   * Links the entry at `index` after `after` in the chain of the container at
   * `block`, which is the head when `after` is -1. Under checks, a container
   * that does not reach the root through `parentOf` throws, since its entries
   * would be lost, and a rule or an at-rule may join only a rule that nests.
   *
   * @param {number} block
   * @param {number} after
   * @param {number} index an entry that is linked nowhere, or was unlinked
   * @return {void}
   */
  linkAfter(block, after, index) {
    if (consistencyChecksEnabled()) {
      this.#assertReachesRoot(block);
      this.#assertCanHold(block, index);
    }
    const holder = this.#containerAt(block);
    const next = after === -1 ? holder.first : this.#next[after];
    this.#parent[index] = block;
    this.#prev[index] = after;
    this.#next[index] = next;
    if (after === -1) holder.first = index;
    else this.#next[after] = index;
    if (next === -1) holder.last = index;
    else this.#prev[next] = index;
    holder.count++;
    if (holder instanceof RuleRecord) {
      holder.childLinked(this.#records.entry(index), next === -1);
    }
  }

  /**
   * Links the entry at `index` at the end of the chain of the block at `block`.
   *
   * @param {number} block
   * @param {number} index an entry that is linked nowhere, or was unlinked
   * @return {void}
   */
  linkLast(block, index) {
    this.linkAfter(block, this.#containerAt(block).last, index);
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
    const holder = this.#containerAt(block);
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
    if (holder instanceof RuleRecord) holder.childUnlinked();
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
   * Under checks, walks `parentOf` up from `index` and throws when a container
   * above it stops the walk at -1. An entry linked nowhere is unplaced and passes.
   *
   * @param {number} index an index that the arena gave, or -1
   * @return {void}
   * @throws {Error} under checks, when a container above `index` does not reach the root
   */
  assertReached(index) {
    if (!consistencyChecksEnabled()) return;
    // An index the arena did not give has no container, and so is unplaced.
    if (this.#parent[index] === undefined || this.#parent[index] === -1) return;
    let at = index;
    while (at !== this.#records.root.index) {
      at = this.#parent[at];
      if (at === -1) throw new Error(NOT_REACHED);
    }
  }

  /**
   * @param {number} index an index that the arena gave, of a container
   * @return {BlockRecord | RuleRecord} the record at `index`
   */
  #containerAt(index) {
    return /** @type {BlockRecord | RuleRecord} */ (
      this.#records.container(index)
    );
  }

  /**
   * @param {number} block a container
   * @param {number} index the entry linked into it
   * @return {void}
   * @throws {Error} when a rule or an at-rule is linked into a rule that holds no rules
   */
  #assertCanHold(block, index) {
    const holder = this.#records.container(block);
    if (holder instanceof RuleRecord && holder.context === -1) {
      const entry = this.#records.entry(index);
      const nests =
        entry instanceof RuleRecord ||
        entry instanceof BlockRecord ||
        (entry instanceof NodeEntry && entry.node.type === 'atrule');
      if (nests) throw new Error(PLAIN_RULE);
    }
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
    // A merged rule stands apart until the merge places it, and its children
    // are built first, so a plain rule with no parent may take children.
    const holder = this.#records.container(block);
    if (
      holder instanceof RuleRecord &&
      holder.context === -1 &&
      this.#parent[block] === -1
    ) {
      return;
    }
    let at = block;
    while (at !== this.#records.root.index) {
      at = this.#parent[at];
      if (at === -1) throw new Error(DETACHED_BLOCK);
    }
  }
}
