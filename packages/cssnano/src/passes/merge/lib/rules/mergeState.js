import { createSelectorLookup } from './ensureCompatibility.js';
import { createElementKeyLookup } from './elementKeys.js';
import { comma } from '../../../../values/punctuationTokens.js';
import { createRunContext } from '../../../ir/runContext.js';
import { isKeyframes, sameContainer } from './sameContainer.js';
import { joinRanges } from '../../../../values/joinRanges.js';
import { selectorPieces } from '../../../../values/selectorRanges.js';
import { tokensText } from '../../../../values/tokensText.js';

/** @import {Container, Declaration, Rule} from 'postcss' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord} from './blockRecord.js' */

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
  /** @type {import('./selectorList.js').SelectorLookup} */
  #lookup;
  /** @type {import('../../../ir/declarationKey.js').DeclarationKeys} */
  #declarations;
  /** @type {(selector: string, piece?: RangePiece | null) => string | null} */
  #elementKeyOf = createElementKeyLookup();
  /** @type {TextTable} */
  #textTable;
  /** @type {Set<number>} the indices of the rules whose selector text is set, and whose tokens are stored at the end of the run */
  #spelled = new Set();
  /** @type {Set<Container> | null} */
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
   * The ids of the run's declarations: equal declarations, with the same
   * property, value, importance and hack prefix, share an id.
   *
   * @return {import('../../../ir/declarationKey.js').DeclarationKeys}
   */
  get declarationIds() {
    return this.#declarations;
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
    this.#spelled.add(record.index);
  }

  /**
   * Stores the tokens of a rule joined from the selectors of `first` and
   * `second`, in that order, with a comma between each, as `join()` writes it.
   *
   * @param {Rule} rule
   * @param {RuleRecord} first
   * @param {RuleRecord} second
   */
  storeJoined(rule, first, second) {
    const earlier = this.piecesOf(first);
    const later = this.piecesOf(second);
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
    for (const index of this.#spelled) {
      const record = /** @type {RuleRecord} */ (this.records.rule(index));
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
   * The block whose chain holds the rule. It is where the rule stands, which
   * can differ from its PostCSS parent during a sweep. A rule that left the
   * stylesheet stands in no block.
   *
   * @param {RuleRecord} record
   * @return {BlockRecord}
   */
  blockOf(record) {
    return /** @type {BlockRecord} */ (
      this.records.block(this.#blockIndexOf(record))
    );
  }

  /**
   * @param {RuleRecord} record
   * @return {number} the index of the block the rule stands in
   */
  #blockIndexOf(record) {
    if (record.departed) throw new Error('block of a departed rule record');
    return this.records.links.parentOf(record.index);
  }

  /**
   * Whether the rules can be merged. `blockA` and `blockB` are the blocks
   * the rules stand in.
   *
   * @param {RuleRecord} recordA
   * @param {RuleRecord} recordB
   * @param {number} [blockA] the index of the block the first rule stands in
   * @param {number} [blockB] the index of the block the second rule stands in
   * @return {boolean}
   */
  canMerge(
    recordA,
    recordB,
    blockA = this.#blockIndexOf(recordA),
    blockB = this.#blockIndexOf(recordB)
  ) {
    const containerA = /** @type {BlockRecord} */ (this.records.block(blockA));
    const containerB = this.records.block(blockB);
    if (!sameContainer(containerA, containerB)) return false;
    if (isKeyframes(containerA.node)) return false;
    if (recordA.block !== -1) return false;
    if (recordB.block !== -1) return false;

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
