import { createSelectorLookup } from './ensureCompatibility.js';
import { createElementKeyLookup } from './elementKeys.js';
import { comma } from '../../../../values/punctuationTokens.js';
import { createRunContext } from '../../../ir/runContext.js';
import { consistencyChecksEnabled } from '../../../ir/consistencyChecks.js';
import { assertDeclarationsFresh } from './blockRecords.js';
import { isKeyframes, sameContainer } from './sameContainer.js';
import { joinRanges } from '../../../../values/joinRanges.js';
import {
  selectorPieces,
  separatorOf,
} from '../../../../values/selectorRanges.js';
import { tokensText } from '../../../../values/tokensText.js';

/** @import {Declaration, Rule} from 'postcss' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {RuleDeclarationKeys} from './ruleRecord.js' */
/** @import {BlockRecord, BlockRecords, Slot} from './blockRecords.js' */

/**
 * The state shared by every merge of one stylesheet.
 */
export default class MergeState {
  /**
   * The keys of the property names this stylesheet's merges compare.
   *
   * @type {PropertyTable}
   */
  properties;
  /** @type {import('./ruleRecord.js').SelectorLookup} */
  #lookup;
  /** @type {import('../../../ir/declarationKey.js').DeclarationKeys} */
  #declarations;
  /** @type {(selector: string, piece?: RangePiece | null) => string | null} */
  #elementKeyOf = createElementKeyLookup();
  /** @type {TextTable} */
  #textTable;
  /** @type {Set<RuleRecord>} rules whose selector text is set, and whose tokens are stored at the end of the run */
  #spelled = new Set();
  /** @type {Set<Rule> | null} */
  #createdBlocks;
  /**
   * The block and rule records of the stylesheet. `runMerge` sets them before
   * any edit reads them.
   *
   * @type {BlockRecords}
   */
  records = /** @type {BlockRecords} */ (/** @type {unknown} */ (null));

  /** @returns {TextTable} the selector tokens the walk stored */
  get textTable() {
    return this.#textTable;
  }

  /**
   * @param {readonly string[]} browsers
   * @param {import('../../../ir/runContext.js').RunContext} [context] the run's state, shared with dedupe
   */
  constructor(browsers, context = createRunContext()) {
    this.#lookup = createSelectorLookup(
      browsers,
      context.selectorCompatibility,
      context.textTable
    );
    this.#declarations = context.declarations;
    this.properties = context.properties;
    this.#createdBlocks = context.createdBlocks;
    this.#textTable = context.textTable;
  }

  /**
   * The record of the rule, which the records hold. Under consistency checks
   * a record whose declarations differ from the tree throws.
   *
   * @param {Rule} rule
   * @return {RuleRecord}
   */
  meta(rule) {
    const record = this.records.metaOf(rule);
    if (consistencyChecksEnabled() && !record.departed) {
      assertDeclarationsFresh(rule, record);
    }
    return record;
  }

  /**
   * The elements the rule can match. An arrow function, so it passes as a
   * callback without a closure per call.
   *
   * @param {RuleRecord} record
   * @return {string[] | null}
   */
  elementKeysOf = (record) => {
    this.piecesOf(record);
    return record.elementKeys(this.#elementKeyOf);
  };

  /**
   * The elements of the rule that stands at a node, as `elementKeysOf` gives
   * them. An arrow function, for the callers that hold only the nodes of
   * declarations.
   *
   * @param {Rule} rule
   * @return {string[] | null}
   */
  elementKeysOfNode = (rule) => this.elementKeysOf(this.meta(rule));

  /**
   * Numbers declarations so equal ones, with the same property, value,
   * importance and hack prefix, share a key for the whole run. An arrow
   * function, so it passes as a callback without a closure per call.
   *
   * @param {Declaration} declaration
   * @return {number}
   */
  declarationKey = (declaration) => this.#declarations.keyOf(declaration);

  /**
   * @param {Rule} rule
   * @return {RuleDeclarationKeys}
   */
  declarationKeysOf(rule) {
    return this.meta(rule).declarationKeys(this.declarationKey);
  }

  /**
   * Reports a rule a merge created, when the run collects them, so the driver
   * canonicalizes it. A rule no run collects is left alone.
   *
   * @param {Rule} rule
   */
  reportCreated(rule) {
    this.#createdBlocks?.add(rule);
  }

  /**
   * Appends selectors of `source` to the rule's selector list, keeping its
   * vendor prefix profile and its token ranges in step.
   *
   * @param {RuleRecord} record
   * @param {string[]} selectors some of the selectors of `source`, in the
   * order of their first occurrence there
   * @param {RuleRecord} source
   * @return {readonly string[] | null} the element keys the selectors add, or
   * null when the rule's elements are not listed
   */
  addSelectors(record, selectors, source) {
    const own = this.piecesOf(record);
    const from = own === null ? null : this.piecesOf(source);
    const pieces =
      from === null
        ? null
        : appendPieces(
            /** @type {RangePiece[]} */ (own),
            selectors,
            source.selectors,
            from
          );
    return record.addSelectors(
      selectors,
      this.#lookup,
      this.#elementKeyOf,
      pieces
    );
  }

  /**
   * The token range of each selector of the rule, read from the text table
   * without tokenizing, or null when the table does not hold them.
   *
   * @param {RuleRecord} record
   * @return {RangePiece[] | null}
   */
  piecesOf(record) {
    if (record.pieces === undefined) {
      const list = this.#textTable.stored(record.node);
      record.setPieces(
        list === undefined ? null : selectorPieces(list, record.selectors)
      );
    }
    return /** @type {RangePiece[] | null} */ (record.pieces);
  }

  /**
   * Sets the selector text of a rule from its list. Its tokens are stored at
   * the end of the run, so a chain of merges into one rule stores them once.
   *
   * @param {RuleRecord} record
   */
  spellSelectors(record) {
    this.#textTable.setText(record.node, record.selectorText());
    this.#spelled.add(record);
  }

  /**
   * Stores the tokens of a copy of `rule` made with the rule's selectors. The
   * copy's text is the one PostCSS joined, so the tokens are stored only when
   * they spell it.
   *
   * @param {Rule} rule
   * @param {Rule} clone
   */
  storeClone(rule, clone) {
    const source = this.#textTable.stored(rule);
    if (source === undefined) return;
    this.#storePieces(
      clone,
      this.piecesOf(this.meta(rule)),
      separatorOf(source)
    );
  }

  /**
   * Stores the tokens of a rule joined from the selectors of `first` and
   * `second`, in that order, with a comma between each, as `join()` writes it.
   *
   * @param {Rule} rule
   * @param {Rule} first
   * @param {Rule} second
   */
  storeJoined(rule, first, second) {
    const earlier = this.piecesOf(this.meta(first));
    const later = this.piecesOf(this.meta(second));
    if (earlier === null || later === null) return;
    this.#storePieces(rule, earlier.concat(later), [comma()]);
  }

  /**
   * Stores the list the pieces join to, when it spells the rule's selector as
   * it is written. Otherwise the rule keeps its text, and a reader tokenizes it.
   *
   * @param {Rule} rule
   * @param {RangePiece[] | null} pieces
   * @param {readonly CSSToken[]} separator
   */
  #storePieces(rule, pieces, separator) {
    if (pieces === null) return;
    const list = joinRanges(pieces, separator);
    if (tokensText(list) === rule.selector) {
      this.#textTable.record(rule, rule.selector, list);
    }
  }

  /**
   * Stores the tokens of every rule `spellSelectors` set, joined from the
   * pieces its list holds. A rule without pieces keeps its text only, and a
   * reader tokenizes it.
   */
  flushSelectors() {
    for (const record of this.#spelled) {
      // A rule that left the stylesheet has nothing to store.
      if (record.departed) continue;
      const pieces = record.pieces;
      if (!pieces) continue;
      const list = joinRanges(pieces, [comma()]);
      if (tokensText(list) === record.selectorText()) {
        this.#textTable.write(record.node, list);
      }
    }
    this.#spelled.clear();
  }

  /**
   * Gives `later` the selectors of `earlier`, which stands before it and is
   * dropped by the caller.
   *
   * @param {RuleRecord} later
   * @param {RuleRecord} earlier
   */
  absorbEarlier(later, earlier) {
    // Both lists of pieces are known before the absorb joins them.
    this.piecesOf(earlier);
    this.piecesOf(later);
    later.absorbEarlier(earlier, this.#lookup, this.#elementKeyOf);
  }

  /**
   * The block whose child list holds the rule's slot. It is where the rule
   * stands, which can differ from its PostCSS parent during a sweep.
   *
   * @param {Rule} rule
   * @return {BlockRecord}
   */
  blockOf(rule) {
    return /** @type {Slot} */ (this.meta(rule).slot).block;
  }

  /**
   * Whether the rules can be merged. `blockA` and `blockB` are the blocks
   * the rules stand in.
   *
   * @param {Rule} ruleA
   * @param {Rule} ruleB
   * @param {BlockRecord} [blockA]
   * @param {BlockRecord} [blockB]
   * @return {boolean}
   */
  canMerge(
    ruleA,
    ruleB,
    blockA = this.blockOf(ruleA),
    blockB = this.blockOf(ruleB)
  ) {
    if (!sameContainer(blockA, blockB, this.#textTable)) return false;
    if (isKeyframes(blockA.node)) return false;
    const recordA = this.meta(ruleA);
    if (recordA.block !== null) return false;
    const recordB = this.meta(ruleB);
    if (recordB.block !== null) return false;

    // The vendor check follows compatibility, because an incompatible selector
    // has no known prefix.
    return (
      recordA.compatible(this.#lookup) &&
      recordB.compatible(this.#lookup) &&
      recordA
        .vendorProfile(this.#lookup)
        .allowsMerge(recordB.vendorProfile(this.#lookup))
    );
  }
}

/**
 * Appends to `pieces` the piece of each selector, found in one pass over the
 * source list, since the selectors follow its order.
 *
 * @param {RangePiece[]} pieces grown in place
 * @param {readonly string[]} selectors
 * @param {readonly string[]} sourceSelectors
 * @param {readonly RangePiece[]} sourcePieces one per source selector
 * @return {RangePiece[]}
 */
function appendPieces(pieces, selectors, sourceSelectors, sourcePieces) {
  let index = 0;
  for (const selector of selectors) {
    while (sourceSelectors[index] !== selector) index++;
    pieces.push(sourcePieces[index]);
  }
  return pieces;
}
