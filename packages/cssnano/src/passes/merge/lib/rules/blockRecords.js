/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
import {
  DeclarationRecord,
  recordDeclaration,
} from '../../../ir/declarationRecord.js';
import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { BlockLinks } from './blockLinks.js';
import { DeclarationStamps } from './declarationStamps.js';
import { DeclarationCache } from './declarationCache.js';
import { assertCanLink, assertReached } from './linkChecks.js';
import { BlockRecord } from './blockRecord.js';
/** @import {NodeEntry} from './blockRecord.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import {LinkReader} from './blockLinks.js' */
/** @import {DeclarationStampReader} from './declarationStamps.js' */
/** @import {DeclarationCacheReader} from './declarationCache.js' */
import { RuleRecord } from './ruleRecord.js';

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

  /** @type {(BlockRecord | RuleRecord | DeclarationRecord | NodeEntry)[]} every entry, by index, dropped and departed ones included */
  #entries = [];

  /** @type {BlockLinks} the chains of the blocks, which only this arena edits */
  #links = new BlockLinks();

  /** @type {LinkReader} the chains of the blocks, read here and edited through this arena */
  links = this.#links;

  /** @type {number} the entries the build made, set by `settle` */
  #built = 0;

  /** @type {DeclarationStamps} the declaration stamp of each container, which only this arena moves */
  #declarationStamps = new DeclarationStamps();

  /** @type {DeclarationStampReader} the declaration stamps, read here and moved through this arena */
  declarationStamps = this.#declarationStamps;

  /** @type {DeclarationCache} the declaration ids of each container, rebuilt from the chain when stale */
  #declarations = new DeclarationCache();

  /** @type {DeclarationCacheReader} the declaration ids, read here and extended through this arena */
  declarations = this.#declarations;

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
    if (container !== -1 && this.#entries[index] instanceof DeclarationRecord) {
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
    if (!(entry instanceof DeclarationRecord)) return;
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
   * Adds a block record to the arena, which gives it the next index.
   *
   * @param {BlockRecord} block
   * @return {void}
   */
  add(block) {
    this.#place(block);
  }

  /**
   * @param {ArenaIndex} index an index that the arena gave
   * @return {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry}
   */
  entry(index) {
    return this.#entries[index];
  }

  /**
   * @param {number} index an index that `add` gave, or -1 for no block
   * @return {BlockRecord | undefined} undefined for -1
   * @throws {Error} under checks, when the entry at `index` is not a block
   */
  block(index) {
    const entry = this.#entries[index];
    if (
      index !== -1 &&
      consistencyChecksEnabled() &&
      !(entry instanceof BlockRecord)
    ) {
      throw new Error('a block is read at an entry that is not a block');
    }
    return /** @type {BlockRecord | undefined} */ (entry);
  }

  /**
   * @param {number} index an index that `add` or `recordRule` gave, or -1 for none
   * @return {BlockRecord | RuleRecord | undefined} the container at `index`, a block or a rule,
   * or undefined for -1
   * @throws {Error} under checks, when the entry at `index` is neither
   */
  container(index) {
    const entry = this.#entries[index];
    const isContainer =
      entry instanceof BlockRecord || entry instanceof RuleRecord;
    if (index !== -1 && consistencyChecksEnabled() && !isContainer) {
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
    return entry instanceof BlockRecord ? entry : undefined;
  }

  /**
   * @param {number} index an index that `recordRule` gave; under checks, throws when the root does not reach it
   */
  rule(index) {
    if (consistencyChecksEnabled()) assertReached(this, index);
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
    assertCanLink(this, block, index);
    const before = this.#declarationStamps.stampOf(block);
    this.#links.linkAfter(block, after, index);
    this.#touchDeclaration(block, index);
    this.#appendDeclaration(block, index, before);
  }

  /**
   * Links the entry at `index` at the end of the chain of the block at `block`.
   *
   * @param {number} block
   * @param {number} index an entry that is linked nowhere, or was unlinked
   * @return {void}
   */
  linkLast(block, index) {
    assertCanLink(this, block, index);
    const before = this.#declarationStamps.stampOf(block);
    this.#links.linkLast(block, index);
    this.#touchDeclaration(block, index);
    this.#appendDeclaration(block, index, before);
  }

  /**
   * Takes the entry at `index` out of its chain. The entry keeps its own
   * subtree, and a later link may place it again.
   *
   * @param {number} index
   * @return {void}
   */
  unlink(index) {
    const block = this.links.parentOf(index);
    this.#links.unlink(index);
    this.#touchDeclaration(block, index);
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
    const to = this.links.parentOf(later);
    assertCanLink(this, to, earlier);
    const from = this.links.parentOf(earlier);
    this.#links.takeLinkOf(later, earlier);
    this.#touchDeclaration(from, earlier);
    this.#touchDeclaration(to, earlier);
    this.#touchDeclaration(to, later);
  }

  /**
   * @return {number} the entries the arena holds, dropped and departed ones included
   */
  entryCount() {
    return this.#entries.length;
  }

  /**
   * The PostCSS node of the entry at `index`, which is a rule, a block, a
   * declaration or a bare node.
   *
   * @param {number} index
   * @return {ChildNode}
   */
  nodeOf(index) {
    return /** @type {ChildNode} */ (
      /** @type {BlockRecord | RuleRecord | DeclarationRecord | NodeEntry} */ (
        this.#entries[index]
      ).node
    );
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

  /**
   * Adds the node of each rule a merge created that has one, in arena order,
   * which is the order the merges made them. Write-back calls it after its walk.
   *
   * @param {Set<Container>} reported
   * @return {void}
   */
  addMergedNodes(reported) {
    for (let index = this.#built; index < this.#entries.length; index++) {
      const entry = this.#entries[index];
      if (entry instanceof RuleRecord && entry.hasNode) {
        reported.add(entry.node);
      }
    }
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
    return this.#place(recordDeclaration(node, properties, declarations));
  }

  /**
   * Adds a bare node, a comment or a statement at-rule, to the arena.
   *
   * @param {NodeEntry} entry
   * @return {NodeEntry}
   */
  bareEntry(entry) {
    return this.#place(entry);
  }

  /**
   * Builds the record of a rule and adds it to the arena. The caller links its
   * children, in order, and places the rule. The selector arguments are the
   * rule's, in PostCSS's form, so a caller passes them rather than read the node.
   *
   * @param {Rule | undefined} rule the node, or undefined for a merged rule
   * @param {string[]} selectors
   * @param {string} selector
   * @param {string} [sourceSelector] set only when the source text differs from the selector
   * @param {readonly CSSToken[]} [tokens] the stored tokens of the source text
   * @return {RuleRecord}
   */
  recordRule(
    rule,
    selectors,
    selector,
    sourceSelector = undefined,
    tokens = undefined
  ) {
    return this.#place(
      new RuleRecord(rule, selectors, selector, sourceSelector, tokens)
    );
  }
}
