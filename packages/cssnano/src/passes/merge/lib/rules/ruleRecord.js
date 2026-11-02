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
/** @import {BlockRecords} from './blockRecords.js' */

const NESTING_RULE = 'a rule that nests holds no declaration list';
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
 * derives facts from, and its children. A nesting rule's children form a chain
 * in the arena of `BlockRecords`, so the record refers to no other record.
 * Every field is set up front so all instances share one object layout.
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
  /**
   * The first entry of the chain of children, which a nesting rule links, or
   * -1 when it holds none. A plain rule keeps its children in its arrays.
   *
   * @type {number}
   */
  first = -1;

  /** @type {number} the last entry of the chain of children, or -1 when it holds none */
  last = -1;

  /** @type {number} the number of entries in the chain, kept by each link and unlink */
  count = 0;

  /**
   * The id of the circumstances under which the rule applies its children, as
   * `containerContext` gives it. It is set once, at the build, for a rule that
   * holds a rule or an at-rule; -1 for any other rule.
   *
   * @type {number}
   */
  context = -1;
  /** @type {boolean} set once a child is added or removed, which the node takes at write-back */
  #edited = false;
  /** @type {number} the place of the record in the arena of its records, -1 until added */
  index = -1;

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
  }

  /** @return {boolean} whether a child was added or removed since the record was made */
  get edited() {
    return this.#edited;
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
    return this.#declarations;
  }

  /** @return {readonly (DeclarationRecord | ChildNode)[]} every child, comments included */
  get children() {
    this.#assertChildren();
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
   * Appends a child to the records. The node takes it at write-back.
   *
   * @param {DeclarationRecord | ChildNode} child
   * @return {void}
   */
  append(child) {
    this.#assertChildren();
    const isDeclarationChild = child instanceof DeclarationRecord;
    const node = isDeclarationChild ? child.node : child;
    inheritWhitespace(node, (this.#entries ?? this.#declarations).at(-1));
    this.#edited = true;
    if (isDeclarationChild) this.#declarations.push(child);
    if (this.#entries) {
      this.#entries.push(child);
    } else if (!isDeclarationChild) {
      this.#entries = [...this.#declarations, child];
    }
    this.#declarationKeys = undefined;
  }

  /**
   * The ids of the declarations, which a nesting rule keeps in its chain.
   *
   * @param {BlockRecords} records the arena that holds the rule's children
   * @return {RuleDeclarationKeys}
   */
  declarationKeys(records) {
    this.#assertLive();
    if (!this.#declarationKeys) {
      const keys = [];
      if (this.context === -1) {
        for (const entry of this.#declarations) keys.push(entry.id);
      } else {
        for (
          let entry = records.links.firstChild(this.index);
          entry !== -1;
          entry = records.links.nextSibling(entry)
        ) {
          const item = records.entry(entry);
          if (item instanceof DeclarationRecord) keys.push(item.id);
        }
      }
      this.#declarationKeys = { keys, keySet: new Set(keys) };
    }
    return this.#declarationKeys;
  }

  /**
   * Removes the declarations at `claimed` from the records. The node drops
   * them at write-back.
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
    if (claimed.size) this.#edited = true;
  }

  /**
   * Removes the declarations at `claimed` as `removeDeclarationsAt` does, and
   * hands over their records for another rule to append.
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
    if (claimed.size) this.#edited = true;
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
   * @throws {Error} when the rule has left the stylesheet, or nests rules or
   * at-rules, whose children its chain holds
   */
  #assertChildren() {
    this.#assertLive();
    if (this.context !== -1) throw new Error(NESTING_RULE);
  }

  /**
   * Under consistency checks, throws when the children the node holds differ
   * from those the record holds, in node or in the facts a record keeps. Call
   * it once the node has taken the edits, at write-back.
   *
   * @throws {Error} when the declarations are stale
   */
  assertFresh() {
    if (!consistencyChecksEnabled() || this.context !== -1) return;
    if (!matchesNode(this.node, this.#entries, this.#declarations)) {
      throw new Error(STALE);
    }
  }
}
