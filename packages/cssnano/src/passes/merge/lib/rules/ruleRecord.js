import { SelectorList } from './selectorList.js';
import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { DeclarationRecord } from '../../../ir/declarationRecord.js';
import { NO_PRELUDE, RULE } from './blockRecord.js';

const STALE_KEYS =
  'declaration keys of a rule record are out of step with its chain';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ChildNode, Declaration, Rule} from 'postcss' */
/** @import {ArenaIndex, NodeEntry} from './blockRecord.js' */
/**
 * @typedef {object} RuleDeclarationKeys
 * @property {number[]} keys the ids of the declarations of the rule, in order
 * @property {Set<number>} keySet the ids of the declarations
 */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {ElementKeyOf, SelectorLookup} from './selectorList.js' */
/** @import {VendorPrefixSummary} from './vendorPrefixSummary.js' */
/** @import {BlockRecords} from './blockRecords.js' */

/**
 * @param {ChildNode} node
 * @return {node is Declaration}
 */
export function isDeclaration(node) {
  return node.type === 'decl';
}

/**
 * What the merge knows of a rule: its selector list, which the base class
 * derives facts from, and its children. The children form a chain in the arena
 * of `BlockRecords`, so the record refers to no other record. Every field is
 * set up front so all instances share one object layout.
 */
export class RuleRecord extends SelectorList {
  /**
   * The ids of the declarations, derived from the chain. It is kept while the
   * chain only gains declarations at its end, and dropped by any other edit.
   *
   * @type {RuleDeclarationKeys | undefined}
   */
  #declarationKeys = undefined;
  /** @type {boolean} set once the rule has left the stylesheet */
  #departed = false;
  /**
   * The id of the circumstances under which the rule applies its children, as
   * `containerContext` gives it. It is set once, at the build, for a rule that
   * holds a rule or an at-rule; -1 for any other rule.
   *
   * @type {number}
   */
  context = -1;

  /** @type {ArenaIndex} the place of the record in the arena of its records, -1 until added */
  index = /** @type {ArenaIndex} */ (-1);

  /** @type {number} RULE, which the window reads with the other records */
  kind = RULE;

  /** @type {string} '' for a rule, which has no at-rule name */
  name = '';

  /** @type {string} '' for a rule, which has no prelude */
  params = '';

  /** @type {boolean} false for a rule, which is no layer */
  anonymous = false;

  /** @type {number} NO_PRELUDE for a rule */
  preludeId = NO_PRELUDE;

  /**
   * The arena index of the rule whose raws a merged rule prints, or -1 for a
   * rule that keeps its own. A merged rule copies the raws of its template.
   *
   * @type {number}
   */
  template = -1;

  /** @type {string | null} the whitespace before the rule, as its node gives it at the build */
  before = '';

  /**
   * @param {Rule} node the rule the record describes
   * @param {string[]} selectors
   * @param {string} selector the selector as PostCSS gives it, which drops a comment only where no tokens join
   * @param {string | undefined} sourceSelector the source text, set only when it differs from the selector
   * @param {readonly CSSToken[] | undefined} tokens the stored tokens of the source text
   */
  constructor(node, selectors, selector, sourceSelector, tokens) {
    super(node, selectors, selector, sourceSelector, tokens);
  }

  /**
   * Whether the rule has left the stylesheet. Only consistency checks read it;
   * no decision does.
   *
   * @return {boolean}
   */
  get departed() {
    return this.#departed;
  }

  /** @return {string[]} change it only through the methods of this class */
  get selectors() {
    this.#assertLive();
    return super.selectors;
  }

  /** @return {RangePiece[] | null | undefined} null when the token ranges are not known, undefined until set */
  get pieces() {
    this.#assertLive();
    return super.pieces;
  }

  /** @param {string} selector the selector, in PostCSS's form */
  setSelector(selector) {
    this.#assertLive();
    super.setSelector(selector);
  }

  /** @param {readonly CSSToken[]} tokens the tokens of the source text */
  setTokens(tokens) {
    this.#assertLive();
    super.setTokens(tokens);
  }

  /** @return {readonly CSSToken[]} the tokens of the source text, tokenized at the first read */
  tokensOf() {
    this.#assertLive();
    return super.tokensOf();
  }

  /** @return {import('./selectorList.js').SelectorRanges} the token range of each selector */
  rangesOf() {
    this.#assertLive();
    return super.rangesOf();
  }

  /** Marks the selector as written by a merge. */
  mark() {
    this.#assertLive();
    super.mark();
  }

  /** @param {RangePiece[] | null} pieces one per selector, or null */
  setPieces(pieces) {
    this.#assertLive();
    super.setPieces(pieces);
  }

  /**
   * The ids of the declarations of the rule. They are read from the chain once,
   * and kept until an edit that is not a declaration appended at its end.
   *
   * @param {BlockRecords} records the arena that holds the rule's children
   * @return {RuleDeclarationKeys}
   */
  declarationKeys(records) {
    this.#assertLive();
    if (!this.#declarationKeys) {
      const keys = [];
      for (
        let entry = records.links.firstChild(this.index);
        entry !== -1;
        entry = records.links.nextSibling(entry)
      ) {
        const item = records.entry(entry);
        if (item instanceof DeclarationRecord) keys.push(item.id);
      }
      this.#declarationKeys = { keys, keySet: new Set(keys) };
    } else if (consistencyChecksEnabled()) {
      this.#assertKeysFresh(records, this.#declarationKeys);
    }
    return this.#declarationKeys;
  }

  /**
   * Under consistency checks, throws when the kept ids differ from the ids of
   * the declarations the chain holds, in order.
   *
   * @param {BlockRecords} records
   * @param {RuleDeclarationKeys} kept
   * @return {void}
   * @throws {Error} when the kept declarations are out of step with the chain
   */
  #assertKeysFresh(records, kept) {
    let at = 0;
    for (
      let entry = records.links.firstChild(this.index);
      entry !== -1;
      entry = records.links.nextSibling(entry)
    ) {
      const item = records.entry(entry);
      if (!(item instanceof DeclarationRecord)) continue;
      if (kept.keys[at++] !== item.id) throw new Error(STALE_KEYS);
    }
    if (at !== kept.keys.length) throw new Error(STALE_KEYS);
  }

  /**
   * The declarations of the rule, in order, read from its chain at the call. A
   * reader that indexes them by position takes this array.
   *
   * @param {BlockRecords} records the arena that holds the rule's children
   * @return {DeclarationRecord[]}
   */
  declarationsOf(records) {
    this.#assertLive();
    /** @type {DeclarationRecord[]} */
    const declarations = [];
    for (
      let entry = records.links.firstChild(this.index);
      entry !== -1;
      entry = records.links.nextSibling(entry)
    ) {
      const item = records.entry(entry);
      if (item instanceof DeclarationRecord) declarations.push(item);
    }
    return declarations;
  }

  /**
   * Called by `BlockLinks` once a child is linked into the chain of the rule.
   * A declaration linked at the end joins the kept ids; any other link drops
   * them.
   *
   * @param {DeclarationRecord | NodeEntry | RuleRecord | import('./blockRecord.js').BlockRecord} child
   *   the record of the child that was linked
   * @param {boolean} atEnd whether the child was linked after the last entry
   * @return {void}
   */
  childLinked(child, atEnd) {
    const kept = this.#declarationKeys;
    if (!kept) return;
    if (atEnd && child instanceof DeclarationRecord) {
      kept.keys.push(child.id);
      kept.keySet.add(child.id);
    } else {
      this.#declarationKeys = undefined;
    }
  }

  /** Called by `BlockLinks` once a child is unlinked from the chain of the rule. */
  childUnlinked() {
    this.#declarationKeys = undefined;
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

  /**
   * @throws {Error} under consistency checks, when the rule this record
   *   describes has left the stylesheet
   */
  #assertLive() {
    if (consistencyChecksEnabled() && this.#departed)
      throw new Error('read of a departed rule record');
  }
}
