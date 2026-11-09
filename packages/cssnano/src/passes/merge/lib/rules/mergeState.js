import { createSelectorLookup } from './ensureCompatibility.js';
import { createElementKeyLookup } from './elementKeys.js';
import { comma } from '../../../../values/punctuationTokens.js';
import { createRunContext } from '../../../ir/runContext.js';
import { isKeyframes, sameContainer } from './sameContainer.js';
import { joinRanges } from '../../../../values/joinRanges.js';
import { selectorPieces } from '../../../../values/selectorRanges.js';
import { tokensText } from '../../../../values/tokensText.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
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
  /** @type {import('../../../ir/selectorIds.js').SelectorIds} */
  #selectorIds;
  /** @type {(selector: string, piece?: RangePiece | null) => string | null} */
  #elementKeyOf = createElementKeyLookup();
  /**
   * The block and rule records of the stylesheet. The driver builds them, and
   * `runMerge` sets them before any edit reads them.
   *
   * @type {BlockRecords}
   */
  records = /** @type {BlockRecords} */ (/** @type {unknown} */ (null));

  /**
   * @param {readonly string[]} browsers
   * @param {import('../../../ir/runContext.js').RunContext} [context] the run's state, shared with dedupe
   */
  constructor(browsers, context = createRunContext()) {
    this.#lookup = createSelectorLookup(
      browsers,
      context.selectorCompatibility
    );
    this.#declarations = context.declarations;
    this.#selectorIds = context.selectorIds;
    this.properties = context.properties;
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
   * The ids of the run's selectors, which list comparisons read.
   *
   * @return {import('../../../ir/selectorIds.js').SelectorIds}
   */
  get selectorIds() {
    return this.#selectorIds;
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
   * The token range of each selector of the rule, read from the tokens the
   * record holds without tokenizing, or null when it holds none.
   *
   * @param {RuleRecord} record
   * @return {RangePiece[] | null}
   */
  piecesOf(record) {
    if (record.pieces === undefined) {
      const { tokens } = record;
      record.setPieces(
        tokens === undefined ? null : selectorPieces(tokens, record.selectors)
      );
    }
    return /** @type {RangePiece[] | null} */ (record.pieces);
  }

  /**
   * Sets the selector of a rule from its list and marks it, so write-back
   * assigns the text. The tokens of the old text are dropped.
   *
   * @param {RuleRecord} record
   */
  spellSelectors(record) {
    record.setSelector(record.selectorText());
    record.mark();
  }

  /**
   * Gives the record the tokens of a rule joined from the selectors of `first`
   * and `second`, in that order, with a comma between each, as `join()` writes it.
   *
   * @param {RuleRecord} record the merged rule, whose selector is the join
   * @param {RuleRecord} first
   * @param {RuleRecord} second
   */
  storeJoined(record, first, second) {
    const earlier = this.piecesOf(first);
    const later = this.piecesOf(second);
    if (earlier === null || later === null) return;
    this.#storePieces(record, earlier.concat(later), [comma()]);
  }

  /**
   * Gives the record the list the pieces join to, when it spells the record's
   * selector as it is written. Otherwise the record keeps no list.
   *
   * @param {RuleRecord} record
   * @param {RangePiece[] | null} pieces
   * @param {readonly CSSToken[]} separator
   */
  #storePieces(record, pieces, separator) {
    if (pieces === null) return;
    const list = joinRanges(pieces, separator);
    if (tokensText(list) === record.selector) record.setTokens(list);
  }

  /**
   * Gives `later` the selectors of `earlier`, which stands before it and is
   * dropped by the caller.
   *
   * @param {RuleRecord} later
   * @param {RuleRecord} earlier
   */
  absorbEarlier(later, earlier) {
    // The compatibility check tokenizes a list that holds no tokens yet, so
    // both checks run before the pieces are read, which cache a missing list.
    earlier.compatible(this.#lookup);
    later.compatible(this.#lookup);
    // Both lists of pieces are known before the absorb joins them.
    this.piecesOf(earlier);
    this.piecesOf(later);
    later.absorbEarlier(earlier, this.#lookup, this.#elementKeyOf);
  }

  /**
   * The container whose chain holds the rule: a block, or a rule that nests.
   * It is where the rule stands, which can differ from its PostCSS parent
   * during a sweep. A rule that left the stylesheet stands in no container.
   *
   * @param {RuleRecord} record
   * @return {BlockRecord | RuleRecord}
   */
  blockOf(record) {
    return /** @type {BlockRecord | RuleRecord} */ (
      this.records.container(this.#blockIndexOf(record))
    );
  }

  /**
   * @param {RuleRecord} record
   * @return {number} the index of the block the rule stands in
   */
  #blockIndexOf(record) {
    // Under checks, `rule` throws when the root no longer reaches the rule.
    this.records.rule(record.index);
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
    const containerA = /** @type {BlockRecord | RuleRecord} */ (
      this.records.container(blockA)
    );
    const containerB = this.records.container(blockB);
    if (!sameContainer(containerA, containerB)) return false;
    if (isKeyframes(containerA)) return false;
    if (recordA.context !== -1) return false;
    if (recordB.context !== -1) return false;

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
