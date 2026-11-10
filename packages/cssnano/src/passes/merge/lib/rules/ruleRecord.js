import { SelectorList } from './selectorList.js';
import { DECLARATION, NO_PRELUDE, RULE } from './blockRecord.js';

/** @import {DeclarationRecord} from '../../../ir/declarationRecord.js' */
/** @import {ArenaIndex, NodeEntry} from './blockRecord.js' */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {ElementKeyOf, SelectorLookup} from './selectorList.js' */
/** @import {VendorPrefixSummary} from './vendorPrefixSummary.js' */
/** @import {BlockRecords} from './blockRecords.js' */

/**
 * What the merge knows of a rule: its selector list, which the base class
 * derives facts from, and its children. The children form a chain in the arena
 * of `BlockRecords`, so the record refers to no other record. Every field is
 * set up front so all instances share one object layout.
 */
export class RuleRecord extends SelectorList {
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
   * @param {string[]} selectors
   * @param {string} selector the selector as PostCSS gives it, which drops a comment only where no tokens join
   * @param {readonly number[]} selectorIds the interned id of each of `selectors`
   */
  constructor(selectors, selector, selectorIds) {
    super(selectors, selector, selectorIds);
  }

  /**
   * The declarations of the rule, in order, read from its chain at the call. A
   * reader that indexes them by position takes this array.
   *
   * @param {BlockRecords} records the arena that holds the rule's children
   * @return {DeclarationRecord[]}
   */
  declarationsOf(records) {
    // Under checks, `rule` throws when the root does not reach this rule.
    records.rule(this.index);
    /** @type {DeclarationRecord[]} */
    const declarations = [];
    for (
      let entry = records.links.firstChild(this.index);
      entry !== -1;
      entry = records.links.nextSibling(entry)
    ) {
      const item = records.entry(entry);
      if (item.kind === DECLARATION) declarations.push(item);
    }
    return declarations;
  }
}
