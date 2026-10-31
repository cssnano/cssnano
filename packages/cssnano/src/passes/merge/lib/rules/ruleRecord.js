import { SelectorList } from './selectorList.js';
import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import {
  childEntries,
  inheritWhitespace,
  matchesNode,
  removeClaimed,
} from './ruleChildren.js';

/** @import {ChildNode} from 'postcss' */

/** @import {Declaration, Rule} from 'postcss' */
/**
 * @typedef {object} RuleDeclarationKeys
 * @property {number[]} keys
 * @property {Set<number>} keySet
 */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {ElementKeyOf, SelectorLookup} from './selectorList.js' */
/** @import {VendorPrefixSummary} from './vendorPrefixSummary.js' */
/** @import {BlockRecord, Slot} from './blockRecords.js' */

const BLOCK_HOLDER = 'a rule that holds a block';
const STALE = 'stale declarations of a rule record';

/**
 * @param {ChildNode} node
 * @return {node is Declaration}
 */
export function isDeclaration(node) {
  return node.type === 'decl';
}

/**
 * What the merge knows of a rule: its selector list, which the base class
 * derives facts from, its children, and where it stands. Every field is set up
 * front so all instances share one object layout.
 */
export class RuleRecord extends SelectorList {
  /** @type {DeclarationRecord[]} the declarations of the rule, in order */
  #declarations;
  /** @type {(DeclarationRecord | ChildNode)[] | null} every child, once a comment is held; null when they are the declarations */
  #entries;
  /** @type {RuleDeclarationKeys | undefined} derived from the declarations */
  #declarationKeys;
  /** @type {boolean} set once the rule has left the stylesheet */
  #departed = false;
  /** @type {Slot | undefined} the slot the rule stands in, once placed */
  #slot;
  /** @type {BlockRecord | null} the record of the rule's children, when it holds a rule or an at-rule */
  #block = null;

  /**
   * @param {Rule} node the rule the record describes
   * @param {string[]} selectors
   * @param {DeclarationRecord[]} declarations
   */
  constructor(node, selectors, declarations) {
    super(node, selectors);
    this.#declarations = declarations;
    this.#entries = childEntries(node, declarations);
    this.#declarationKeys = undefined;
    this.#slot = undefined;
  }

  /** @return {Slot | undefined} the slot the rule stands in, readable after departure */
  get slot() {
    return this.#slot;
  }

  /** @return {BlockRecord | null} the record of the children, when the rule holds a rule or an at-rule */
  get block() {
    return this.#block;
  }

  /** @param {Slot} slot the slot the rule now stands in */
  place(slot) {
    this.#slot = slot;
  }

  /** @param {BlockRecord} block the record of the rule's children */
  setBlock(block) {
    this.#block = block;
  }

  /** @return {boolean} whether the rule has left the stylesheet; reading it does not throw */
  get departed() {
    return this.#departed;
  }

  /** @return {string[]} change it only through the methods of this class */
  get selectors() {
    this.#assertLive();
    return super.selectors;
  }

  /** @return {DeclarationRecord[]} the declarations, without comments */
  get declarations() {
    this.#assertChildren();
    this.assertFresh();
    return this.#declarations;
  }

  /** @return {readonly (DeclarationRecord | ChildNode)[]} every child, comments included */
  get children() {
    this.#assertChildren();
    this.assertFresh();
    return this.#entries ?? this.#declarations;
  }

  /** @return {number} the children, comments included */
  childCount() {
    this.#assertChildren();
    return (this.#entries ?? this.#declarations).length;
  }

  /** @return {boolean} whether every child is a declaration, as an empty rule is */
  holdsOnlyDeclarations() {
    this.#assertChildren();
    return this.#entries === null;
  }

  /** @return {RangePiece[] | null | undefined} null when the token ranges are not known, undefined until set */
  get pieces() {
    this.#assertLive();
    return super.pieces;
  }

  /** @param {RangePiece[] | null} pieces one per selector, or null */
  setPieces(pieces) {
    this.#assertLive();
    super.setPieces(pieces);
  }

  /**
   * Appends a child to the node and to the records.
   *
   * @param {DeclarationRecord | ChildNode} child
   * @return {void}
   */
  append(child) {
    this.#assertChildren();
    const isDeclarationChild = child instanceof DeclarationRecord;
    const node = isDeclarationChild ? child.node : child;
    inheritWhitespace(node, (this.#entries ?? this.#declarations).at(-1));
    this.node.append(node);
    if (isDeclarationChild) this.#declarations.push(child);
    if (this.#entries) {
      this.#entries.push(child);
    } else if (!isDeclarationChild) {
      this.#entries = [...this.#declarations, child];
    }
    this.#declarationKeys = undefined;
  }

  /**
   * The ids of the declarations, which a block holder keeps in its block.
   *
   * @return {RuleDeclarationKeys}
   */
  declarationKeys() {
    this.#assertLive();
    if (!this.#declarationKeys) {
      const keys = [];
      const list = this.#block ? this.#block.children : this.#declarations;
      for (const entry of list) {
        if (entry instanceof DeclarationRecord) keys.push(entry.id);
      }
      this.#declarationKeys = { keys, keySet: new Set(keys) };
    }
    return this.#declarationKeys;
  }

  /**
   * Removes the declarations at `claimed` from the node and the records.
   *
   * @param {Set<number>} claimed the positions of the declarations that leave
   * @return {void}
   */
  removeDeclarationsAt(claimed) {
    this.#assertChildren();
    removeClaimed(
      this.#entries ?? this.#declarations,
      this.#declarations,
      claimed
    );
    this.#declarationKeys = undefined;
  }

  /**
   * Removes the declarations at `claimed` as `removeDeclarationsAt` does, and
   * hands over their records and nodes for another rule to append.
   *
   * @param {Set<number>} claimed the positions of the declarations that leave
   * @return {DeclarationRecord[]} the removed records, in order
   */
  takeDeclarationsAt(claimed) {
    this.#assertChildren();
    /** @type {DeclarationRecord[]} */
    const taken = [];
    removeClaimed(
      this.#entries ?? this.#declarations,
      this.#declarations,
      claimed,
      taken
    );
    this.#declarationKeys = undefined;
    return taken;
  }

  /**
   * @param {SelectorLookup} lookup
   * @return {VendorPrefixSummary}
   */
  vendorProfile(lookup) {
    this.#assertLive();
    return super.vendorProfile(lookup);
  }

  /**
   * @param {SelectorLookup} lookup
   * @return {boolean} whether every selector is compatible with the target browsers
   */
  compatible(lookup) {
    this.#assertLive();
    return super.compatible(lookup);
  }

  /**
   * @param {ElementKeyOf} [keyOf]
   * @return {string[] | null} see `SelectorList#elementKeys`
   */
  elementKeys(keyOf) {
    this.#assertLive();
    return super.elementKeys(keyOf);
  }

  /** @return {string} */
  selectorText() {
    this.#assertLive();
    return super.selectorText();
  }

  /**
   * @param {RuleRecord} other
   * @return {boolean}
   */
  hasSameSelectors(other) {
    this.#assertLive();
    other.#assertLive();
    return super.hasSameSelectors(other);
  }

  /**
   * @param {string[]} selectors appended to the rule's selector list
   * @param {SelectorLookup} lookup
   * @param {ElementKeyOf} [keyOf]
   * @param {RangePiece[] | null} [pieces]
   * @return {readonly string[] | null} see `SelectorList#add`
   */
  addSelectors(selectors, lookup, keyOf, pieces) {
    this.#assertLive();
    return super.addSelectors(selectors, lookup, keyOf, pieces);
  }

  /**
   * Takes the place of a rule that is dropped and stood before this one.
   *
   * @param {RuleRecord} earlier left unusable
   * @param {SelectorLookup} lookup
   * @param {ElementKeyOf} [keyOf]
   */
  absorbEarlier(earlier, lookup, keyOf) {
    this.#assertLive();
    earlier.#assertLive();
    super.absorbEarlier(earlier, lookup, keyOf);
    earlier.#departed = true;
  }

  /** Marks the record of a rule that left the stylesheet, so a later read throws. */
  depart() {
    this.#departed = true;
  }

  /** @throws {Error} when the rule this record describes has left the stylesheet */
  #assertLive() {
    if (this.#departed) throw new Error('read of a departed rule record');
  }

  /**
   * @throws {Error} when the rule has left the stylesheet, or holds a block
   * whose children stand in its block record
   */
  #assertChildren() {
    this.#assertLive();
    if (this.#block) throw new Error(BLOCK_HOLDER);
  }

  /**
   * Under consistency checks, throws when the declarations held differ from
   * those the rule holds now, in node or in the facts a record keeps, which an
   * edit that skipped its bookkeeping leaves.
   *
   * @throws {Error} when the declarations are stale
   */
  assertFresh() {
    if (!consistencyChecksEnabled() || this.#block) return;
    if (!matchesNode(this.node, this.#entries, this.#declarations)) {
      throw new Error(STALE);
    }
  }
}
