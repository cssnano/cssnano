/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
import { BlockLinks } from './blockLinks.js';
import { DeclarationStamps } from './declarationStamps.js';
import { DeclarationCache } from './declarationCache.js';
import { assertCanLink, assertReached } from './linkChecks.js';
import { AT_RULE_BLOCK, DECLARATION, RULE, STYLESHEET } from './blockRecord.js';
/** @import {BlockRecord, NodeEntry} from './blockRecord.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import {LinkReader} from './blockLinks.js' */
/** @import {DeclarationStampReader} from './declarationStamps.js' */
/** @import {DeclarationCacheReader} from './declarationCache.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {RuleRecord} from './ruleRecord.js' */

const MOVED_ROOT = 'the root is moved into a chain';

/**
 * The records of one run. One arena holds every block record, every rule record,
 * every declaration of a block and every bare node of a block, each at the next
 * index of one counter; an index is never reused within a run. A block's
 * children are the entries its chain links, and a rule's own declarations stay
 * in its record. Ownership is a tree, so an edit that touches more than one
 * record is a method here.
 */
export class BlockRecords {
  /** @type {BlockRecord} the record of the stylesheet */
  root;

  /** @type {(BlockRecord | RuleRecord | DeclarationRecord | NodeEntry)[]} every entry, by index, dropped ones included */
  #entries = [];

  /** @type {BlockLinks} the chains of the blocks, which only this arena edits */
  #links;

  /** @type {LinkReader} the chains of the blocks, read here and edited through this arena */
  links;

  /** @type {boolean} whether reads and edits check the tree, fixed by the run */
  consistencyChecks;

  /** @type {number} the entries the build made, set by `settle` */
  #built = 0;

  /** @type {DeclarationStamps} the declaration stamp of each container, which only this arena moves */
  #declarationStamps = new DeclarationStamps();

  /** @type {DeclarationStampReader} the declaration stamps, read here and moved through this arena */
  declarationStamps = this.#declarationStamps;

  /** @type {DeclarationCache} the declaration ids of each container, rebuilt from the chain when stale */
  #declarations;

  /** @type {DeclarationCacheReader} the declaration ids, read here and extended through this arena */
  declarations;

  /**
   * The whitespace before the first child of the stylesheet, which PostCSS
   * hands on when that child is removed, or null when the node has none and
   * the printer infers it.
   *
   * @type {string | null}
   */
  leadingWhitespace = null;

  /**
   * The most rounds a run may take before it throws. Set from the counts of
   * rules, at-rules and declarations when the records are built.
   *
   * @type {number}
   */
  maxRounds = Infinity;

  /**
   * @param {BlockRecord} root the record of the stylesheet
   * @param {boolean} consistencyChecks whether the arena and its tables check their reads and edits
   */
  constructor(root, consistencyChecks) {
    this.root = root;
    this.consistencyChecks = consistencyChecks;
    this.#links = new BlockLinks(consistencyChecks);
    this.links = this.#links;
    this.#declarations = new DeclarationCache(consistencyChecks);
    this.declarations = this.#declarations;
    this.#place(root);
  }

  /**
   * Gives an entry the next index of the arena and keeps it there, then links
   * it at the end of the chain of `container`. The entry is unplaced, its index
   * -1, until this call.
   *
   * @param {number} container
   * @param {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry} entry
   * @return {void}
   */
  appendEntry(container, entry) {
    this.#placeUnplaced(entry);
    this.#linkLast(container, entry.index);
  }

  /**
   * Gives an unplaced entry the next index of the arena and links it right
   * before `sibling`, in the chain that holds `sibling`.
   *
   * @param {ArenaIndex} sibling a linked entry
   * @param {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry} entry
   * @return {void}
   */
  insertEntryBefore(sibling, entry) {
    this.#placeUnplaced(entry);
    this.#linkBefore(sibling, entry.index);
  }

  /**
   * Takes a placed entry out of its chain, if it is linked, then links it at
   * the end of the chain of `container`.
   *
   * @param {ArenaIndex} container
   * @param {ArenaIndex} index
   * @return {void}
   */
  moveLast(container, index) {
    this.#assertMovable(index);
    this.detach(index);
    this.#linkLast(container, index);
  }

  /**
   * Takes a placed entry out of its chain, if it is linked, then links it right
   * before `sibling`.
   *
   * @param {ArenaIndex} sibling a linked entry that is not `index`
   * @param {ArenaIndex} index
   * @return {void}
   */
  moveBefore(sibling, index) {
    this.#assertMovable(index);
    this.detach(index);
    this.#linkBefore(sibling, index);
  }

  /**
   * Takes the entry at `index` out of its chain. The entry keeps its own
   * subtree, and a later move may place it again.
   *
   * @param {ArenaIndex} index
   * @return {void}
   */
  detach(index) {
    const block = this.links.parentOf(index);
    this.#links.unlink(index);
    this.#touchDeclaration(block, index);
  }

  /**
   * @template {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry} T
   * @param {T} entry an entry that is unplaced
   * @return {void}
   */
  #placeUnplaced(entry) {
    if (this.consistencyChecks && entry.index !== -1) {
      throw new Error('an entry is placed twice in the arena');
    }
    this.#place(entry);
  }

  /**
   * Gives an entry the next index of the arena and keeps it there.
   *
   * @template {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry} T
   * @param {T} entry
   * @return {T}
   */
  #place(entry) {
    entry.index = /** @type {ArenaIndex} */ (this.#entries.length);
    this.#entries.push(entry);
    this.#links.grow();
    this.#declarationStamps.grow();
    this.#declarations.grow();
    return entry;
  }

  /**
   * Moves the declaration stamp of `container` when the entry at `index` is a
   * declaration, which joins or leaves its chain.
   *
   * @param {number} container an index that the arena gave, or -1 for none
   * @param {number} index an index that the arena gave
   * @return {void}
   */
  #touchDeclaration(container, index) {
    if (container !== -1 && this.#entries[index]?.kind === DECLARATION) {
      this.#declarationStamps.touch(container);
    }
  }

  /**
   * Extends the declaration cache of `block` with the entry at `index`, when
   * that entry is a declaration that the link left at the end of the chain.
   *
   * @param {number} block an index that the arena gave
   * @param {number} index an entry that was just linked into `block`
   * @param {number} before the declaration stamp of `block` before the link
   * @return {void}
   */
  #appendDeclaration(block, index, before) {
    const entry = this.#entries[index];
    if (entry?.kind !== DECLARATION) return;
    if (this.#links.nextSibling(/** @type {ArenaIndex} */ (index)) !== -1) {
      return;
    }
    this.#declarations.appended(
      /** @type {ArenaIndex} */ (block),
      entry,
      before,
      this.#declarationStamps.stampOf(block)
    );
  }

  /**
   * @param {ArenaIndex} index an index that the arena gave
   * @return {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry}
   */
  entry(index) {
    return this.#entries[index];
  }

  /**
   * @param {number} index an index that the arena gave, or -1 for no block
   * @return {BlockRecord | undefined} undefined for -1
   * @throws {Error} under checks, when the entry at `index` is not a block
   */
  block(index) {
    const entry = this.#entries[index];
    if (
      index !== -1 &&
      this.consistencyChecks &&
      !(entry.kind === STYLESHEET || entry.kind === AT_RULE_BLOCK)
    ) {
      throw new Error('a block is read at an entry that is not a block');
    }
    return /** @type {BlockRecord | undefined} */ (entry);
  }

  /**
   * @param {number} index an index that the arena gave, or -1 for none
   * @return {BlockRecord | RuleRecord | undefined} the container at `index`, a block or a rule,
   * or undefined for -1
   * @throws {Error} under checks, when the entry at `index` is neither
   */
  container(index) {
    const entry = this.#entries[index];
    const isContainer =
      entry?.kind === STYLESHEET ||
      entry?.kind === AT_RULE_BLOCK ||
      entry?.kind === RULE;
    if (index !== -1 && this.consistencyChecks && !isContainer) {
      throw new Error(
        'a container is read at an entry that is neither a block nor a rule'
      );
    }
    return isContainer ? entry : undefined;
  }

  /**
   * @param {number} index an index that the arena gave
   * @return {BlockRecord | undefined} the block at `index`, or undefined when the entry is another kind
   */
  blockEntry(index) {
    const entry = this.#entries[index];
    return entry?.kind === STYLESHEET || entry?.kind === AT_RULE_BLOCK
      ? entry
      : undefined;
  }

  /**
   * @param {number} index an index that the arena gave; under checks, throws when the root does not reach it
   */
  rule(index) {
    if (this.consistencyChecks) assertReached(this, index);
    return /** @type {RuleRecord | undefined} */ (this.#entries[index]);
  }

  /**
   * The container whose chain holds the entry at `index`.
   *
   * @param {number} index an index that the arena gave
   * @return {BlockRecord | RuleRecord | undefined} undefined when the entry is linked nowhere
   */
  enclosingContainer(index) {
    return this.container(this.links.parentOf(index));
  }

  /**
   * Links the entry at `index` at the end of the chain of the block at `block`.
   * Under checks, a container that does not reach the root through `parentOf`
   * throws, since its entries would be lost, and a rule or an at-rule may join
   * only a rule that nests.
   *
   * @param {number} block
   * @param {number} index an entry that is linked nowhere
   * @return {void}
   */
  #linkLast(block, index) {
    assertCanLink(this, block, index);
    const before = this.#declarationStamps.stampOf(block);
    this.#links.linkLast(block, index);
    this.#touchDeclaration(block, index);
    this.#appendDeclaration(block, index, before);
  }

  /**
   * Links the entry at `index` right before `sibling`, in the chain that holds
   * `sibling`. The same checks as `#linkLast` apply to that chain.
   *
   * @param {ArenaIndex} sibling a linked entry
   * @param {number} index an entry that is linked nowhere
   * @return {void}
   */
  #linkBefore(sibling, index) {
    const block = this.links.parentOf(sibling);
    // Reading the sibling's neighbour throws under checks when it is linked
    // nowhere, before its -1 container reaches `assertCanLink`.
    this.links.prevSibling(sibling);
    assertCanLink(this, block, index);
    const before = this.#declarationStamps.stampOf(block);
    this.#links.linkBefore(sibling, index);
    this.#touchDeclaration(block, index);
    this.#appendDeclaration(block, index, before);
  }

  /**
   * Under checks, throws when the entry to move is the root, which has no
   * container to join.
   *
   * @param {ArenaIndex} index
   * @return {void}
   * @throws {Error} under checks, when `index` is the root
   */
  #assertMovable(index) {
    if (this.consistencyChecks && index === this.root.index) {
      throw new Error(MOVED_ROOT);
    }
  }

  /**
   * @return {number} the entries the arena holds, dropped ones included
   */
  entryCount() {
    return this.#entries.length;
  }

  /**
   * Settles the links once the build has linked the children, so that only
   * edits after the build count as edits. Entries from here on are the merges'.
   *
   * @return {void}
   */
  settle() {
    this.#links.settle();
    this.#built = this.#entries.length;
  }

  /**
   * @return {number} the entries the build made, which precede every entry a merge added
   */
  get builtCount() {
    return this.#built;
  }
}
