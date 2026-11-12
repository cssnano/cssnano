/** @import {TokenListId} from './tokenLists.js' */
import { UNFOLDED_VENDOR } from '../merge/lib/rules/selectorList.js';
import { RULE } from './blockRecord.js';

/** @import {RuleElementKeys} from '../merge/lib/rules/elementKeys.js' */
/** @import {VendorPrefixSummary} from '../merge/lib/rules/vendorPrefixSummary.js' */
/** @import {ArenaIndex, NodeEntry} from './blockRecord.js' */
/** @import {RangePiece} from '../../values/joinRanges.js' */
/** @import {BlockRecords} from './blockRecords.js' */

/**
 * What the merge knows of a rule: its selector list, with the facts folded from
 * its ids, and its children. The children form a chain in the arena
 * of `BlockRecords`, so the record refers to no other record. Every field is
 * set up front so all instances share one object layout.
 */
export class RuleRecord {
  /**
   * The interned id of each selector, in order. A selector's id is the same
   * for every rule that holds an equal item. It is read-only: only the
   * functions of this module move or append ids.
   *
   * @readonly
   * @type {readonly TokenListId[]}
   */
  selectorIds;

  /**
   * Whether every selector suits the target browsers.
   *
   * @readonly
   * @type {boolean}
   */
  compatible = false;

  /**
   * The vendor prefix summary of the selectors.
   *
   * @readonly
   * @type {VendorPrefixSummary}
   */
  vendor = UNFOLDED_VENDOR;

  /**
   * The element keys of the selectors, or null when a selector has none. The
   * list is empty when the rule has no selectors.
   *
   * @readonly
   * @type {RuleElementKeys | null}
   */
  elementKeys = null;

  /**
   * Whether an edit changed the rule's list, so write-back must write its
   * selector. Every edit that changes the ids sets it.
   *
   * @readonly
   * @type {boolean}
   */
  marked = false;

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

  /** @type {typeof RULE} RULE, which the window reads with the other records */
  kind = RULE;

  /**
   * The arena index of the rule whose raws a merged rule prints, or -1 for a
   * rule that keeps its own. A merged rule copies the raws of its template,
   * so the template always holds a node.
   *
   * @type {number}
   */
  template = -1;

  /** @type {string | null} the whitespace before the rule, as its node gives it at the build */
  before;

  /**
   * @param {string | null} before the whitespace before the rule
   * @param {readonly TokenListId[]} selectorIds the interned id of each selector
   */
  constructor(before, selectorIds) {
    this.before = before;
    this.selectorIds = selectorIds;
  }
}
