/** @import {ChildNode, Container, Rule} from 'postcss' */
/** @import {DeclarationKeys} from '../../../ir/declarationKey.js' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
import { recordDeclaration } from '../../../ir/declarationRecord.js';
import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { BlockLinks } from './blockLinks.js';
import { BlockRecord, NodeEntry } from './blockRecord.js';
import {
  inheritWhitespace,
  liveChildren,
  liveCount,
  liveEntries,
} from './blockChildren.js';
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

  /** @type {BlockLinks} the chains of the blocks, and each entry's container */
  links = new BlockLinks(this);

  /** @type {Map<string, number> | null} declarations the input wrote, under checks */
  inputWrites = null;

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
    entry.index = this.#entries.length;
    this.#entries.push(entry);
    this.links.grow();
    return entry;
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
   * @param {number} index an index that the arena gave
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
   * @param {number} index an index that the arena gave
   * @return {boolean} whether a sweep dropped the block at `index`, which leaves the tree
   */
  isDropped(index) {
    return (
      index !== this.root.index &&
      this.links.parentOf(index) === -1 &&
      this.blockEntry(index) !== undefined
    );
  }

  /**
   * @param {number} index an index that `recordRule` gave
   * @return {RuleRecord | undefined}
   */
  rule(index) {
    return /** @type {RuleRecord | undefined} */ (this.#entries[index]);
  }

  /**
   * @return {number} the entries the arena holds, dropped and departed ones included
   */
  entryCount() {
    return this.#entries.length;
  }

  /**
   * The records of every block the run added, dropped ones included.
   *
   * @return {Generator<BlockRecord>}
   */
  *blocks() {
    for (const entry of this.#entries) {
      if (entry instanceof BlockRecord) yield entry;
    }
  }

  /**
   * The records of every container the run added that holds children: each
   * block, and each rule that nests. Dropped and departed ones included.
   *
   * @return {Generator<BlockRecord | RuleRecord>}
   */
  *containers() {
    for (const entry of this.#entries) {
      if (entry instanceof BlockRecord) yield entry;
      else if (entry instanceof RuleRecord && entry.context !== -1) yield entry;
    }
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
   * The live children of the block at `index`, counted; see `blockChildren.js`.
   *
   * @param {number} index
   * @return {number}
   */
  liveCount(index) {
    return liveCount(this, index);
  }

  /**
   * The live entries of the block at `index`; see `blockChildren.js`.
   *
   * @param {number} index
   * @return {(RuleRecord | BlockRecord | DeclarationRecord | ChildNode)[]}
   */
  liveEntries(index) {
    return liveEntries(this, index);
  }

  /**
   * The live children of the block at `index`; see `blockChildren.js`.
   *
   * @param {number} index
   * @return {ChildNode[]}
   */
  liveChildren(index) {
    return liveChildren(this, index);
  }

  /**
   * Replaces the rule `record` with the rules `replacements`, which take its
   * place in the chain, in order.
   *
   * @param {number} record the index of the rule that is replaced
   * @param {number[]} replacements
   * @return {void}
   */
  substitute(record, replacements) {
    // The replacements take the chain where the record stood, which may be
    // the record itself; it is read before the record leaves the chain.
    const holder = this.links.parentOf(record);
    let after = this.links.prevSibling(record);
    this.links.unlink(record);
    for (const replacement of replacements) {
      this.links.linkAfter(holder, after, replacement);
      after = replacement;
    }
  }

  /**
   * Moves the rule `record` to the end of the chain of the block at `target`.
   *
   * @param {number} target the index of the block that takes the rule
   * @param {number} record the index of the rule
   * @return {void}
   */
  moveRule(target, record) {
    this.links.unlink(record);
    this.links.linkLast(target, record);
  }

  /**
   * Moves the chain of the block at `source` to the end of the chain of the
   * block at `target`. `source` is left with no children, since the caller
   * removes it. A nested block keeps its rule, which moves with the chain.
   *
   * @param {number} target
   * @param {number} source
   * @return {void}
   */
  adopt(target, source) {
    const from = /** @type {BlockRecord} */ (this.block(source));
    while (from.first !== -1) {
      const entry = from.first;
      this.links.unlink(entry);
      this.links.linkLast(target, entry);
    }
  }

  /**
   * Clears the edited flag of every rule, once the build has linked their
   * children, so that only edits after the build mark a rule.
   *
   * @return {void}
   */
  settle() {
    for (const entry of this.#entries) {
      if (entry instanceof RuleRecord) entry.settle();
    }
  }

  /**
   * Builds the record of a declaration that is a rule's child.
   *
   * @param {import('postcss').Declaration} node
   * @param {PropertyTable} properties the keys of the property names
   * @param {DeclarationKeys} declarations the ids of the declarations
   * @return {DeclarationRecord}
   */
  declarationRecord(node, properties, declarations) {
    return recordDeclaration(node, properties, declarations);
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
    return this.#place(this.declarationRecord(node, properties, declarations));
  }

  /**
   * Adds a bare node of a block, a comment or a statement at-rule, to the
   * arena, which gives it the next index.
   *
   * @param {ChildNode} node
   * @return {NodeEntry}
   */
  bareEntry(node) {
    return this.#place(new NodeEntry(node));
  }

  /**
   * Builds the record of a rule and adds it to the arena, which gives it the
   * next index. The rule has no children yet: the caller links them, in order.
   * The slot the caller places the rule in is what holds it.
   *
   * @param {Rule} rule
   * @return {RuleRecord}
   */
  recordRule(rule) {
    return this.#place(new RuleRecord(rule, rule.selectors));
  }

  /**
   * Appends a child to the chain of a rule, after its last child, and gives the
   * child the whitespace of that child when it has none. The node takes it at
   * write-back. The child must be linked nowhere, or unlinked.
   *
   * @param {RuleRecord} rule
   * @param {DeclarationRecord | NodeEntry} child
   * @return {void}
   */
  appendChild(rule, child) {
    const last = this.links.lastChild(rule.index);
    inheritWhitespace(child.node, last === -1 ? undefined : this.nodeOf(last));
    this.links.linkLast(rule.index, child.index);
  }

  /**
   * Removes the declarations of a rule at the positions `claimed`, which index
   * the declarations as they stand at the call. The node drops them at
   * write-back.
   *
   * @param {RuleRecord} rule
   * @param {Set<number>} claimed the positions of the declarations that leave
   * @return {void}
   */
  removeDeclarationsAt(rule, claimed) {
    this.takeDeclarationsAt(rule, claimed);
  }

  /**
   * Removes the declarations of a rule at the positions `claimed`, as
   * `removeDeclarationsAt` does, and returns their records for another rule to
   * append.
   *
   * @param {RuleRecord} rule
   * @param {Set<number>} claimed the positions of the declarations that leave
   * @return {DeclarationRecord[]} the removed records, in order
   */
  takeDeclarationsAt(rule, claimed) {
    const taken = this.#claimedAt(rule, claimed);
    for (const declaration of taken) this.links.unlink(declaration.index);
    return taken;
  }

  /**
   * The declarations of a rule at the positions `claimed`, read before any of
   * them is unlinked, so the positions index the declarations at the call.
   *
   * @param {RuleRecord} rule
   * @param {Set<number>} claimed
   * @return {DeclarationRecord[]}
   */
  #claimedAt(rule, claimed) {
    /** @type {DeclarationRecord[]} */
    const taken = [];
    let position = 0;
    for (
      let declaration = this.links.firstDeclaration(rule.index);
      declaration !== undefined;
      declaration = this.links.nextDeclaration(declaration)
    ) {
      if (claimed.has(position++)) taken.push(declaration);
    }
    return taken;
  }
}
