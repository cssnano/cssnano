/** @import {TokenListId} from '../../../ir/tokenLists.js' */
import {
  absorbEarlier as absorbSummaries,
  addSelectors as addSummarySelectors,
} from '../../../ir/selectorList.js';
import { compatibleOf, vendorSummaryOf } from '../../../ir/selectorReads.js';
import { createRunContext } from '../../../ir/runContext.js';
import { isKeyframes, sameContainer } from '../../../ir/sameContainer.js';

/** @import {RuleRecord} from '../../../ir/ruleRecord.js' */
/** @import {BlockRecords} from '../../../ir/blockRecords.js' */
/** @import {BlockRecord} from '../../../ir/blockRecord.js' */

/**
 * The state shared by every merge of one stylesheet.
 */
export default class MergeState {
  /** @type {import('../../../ir/runContext.js').RunContext} */
  #context;
  /** @type {readonly string[]} */
  #browsers;
  /** @type {import('../../../ir/tokenLists.js').TokenLists} */
  #tokenLists;
  /**
   * The block and rule records of the stylesheet. The driver builds them, and
   * `runMerge` sets them before any edit reads them.
   *
   * @type {BlockRecords}
   */
  records = /** @type {BlockRecords} */ (/** @type {unknown} */ (null));

  /**
   * The most rounds the joins of the run may take before it throws. `runMerge`
   * sets it from the live entries when it starts.
   *
   * @type {number}
   */
  maxRounds = Infinity;

  /**
   * @param {readonly string[]} browsers
   * @param {import('../../../ir/runContext.js').RunContext} [context] the run's state, shared with dedupe
   */
  constructor(browsers, context = createRunContext()) {
    this.#context = context;
    this.#tokenLists = context.tokenLists;
    this.#browsers = browsers;
  }

  /**
   * The state of the run, which the records of its declarations are built from.
   *
   * @return {import('../../../ir/runContext.js').RunContext}
   */
  get runContext() {
    return this.#context;
  }

  /**
   * The token lists of the run, which the ids of the records name.
   *
   * @return {import('../../../ir/tokenLists.js').TokenLists}
   */
  get tokenLists() {
    return this.#tokenLists;
  }

  /**
   * The target browsers, which the selector facts of the run depend on.
   *
   * @return {readonly string[]}
   */
  get browsers() {
    return this.#browsers;
  }

  /**
   * The ids of the run's declarations: equal declarations, with the same
   * property, value, importance and hack prefix, share an id.
   *
   * @return {import('../../../ir/declarationKey.js').DeclarationKeys}
   */
  get declarationIds() {
    return this.#context.declarations;
  }

  /**
   * Appends selectors of `source` to the rule's selector list, keeping its
   * vendor prefix profile in step.
   *
   * @param {RuleRecord} record
   * @param {readonly TokenListId[]} ids the id of each selector the rule gains,
   * in order
   * @return {readonly string[] | null} the element keys the selectors add, or
   * null when the rule's elements are not listed
   */
  addSelectors(record, ids) {
    return addSummarySelectors(
      this.records,
      record.index,
      ids,
      this.#tokenLists,
      this.#browsers
    );
  }

  /**
   * Gives `later` the selectors of `earlier`, which stands before it and is
   * dropped by the caller.
   *
   * @param {RuleRecord} later
   * @param {RuleRecord} earlier
   */
  absorbEarlier(later, earlier) {
    absorbSummaries(this.records, later.index, earlier.index);
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
      compatibleOf(this.records, recordA.index) &&
      compatibleOf(this.records, recordB.index) &&
      vendorSummaryOf(this.records, recordA.index).allowsMerge(
        vendorSummaryOf(this.records, recordB.index)
      )
    );
  }
}
