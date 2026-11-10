import { selectorInfoOf } from './ensureCompatibility.js';
import { elementKeyOf } from './elementKeys.js';
import { createRunContext } from '../../../ir/runContext.js';
import { isKeyframes, sameContainer } from './sameContainer.js';

/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord} from './blockRecord.js' */

/**
 * The state shared by every merge of one stylesheet.
 */
export default class MergeState {
  /** @type {import('./selectorList.js').SelectorLookup} */
  #lookup;
  /** @type {import('../../../ir/declarationKey.js').DeclarationKeys} */
  #declarations;
  /** @type {(id: number) => string | null} */
  #elementKeyOf;
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
   * @param {readonly string[]} browsers
   * @param {import('../../../ir/runContext.js').RunContext} [context] the run's state, shared with dedupe
   */
  constructor(browsers, context = createRunContext()) {
    const { tokenLists } = context;
    this.#tokenLists = tokenLists;
    this.#lookup = (id) => selectorInfoOf(tokenLists.get(id), browsers);
    this.#elementKeyOf = (id) => elementKeyOf(tokenLists.get(id));
    this.#declarations = context.declarations;
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
   * The elements the rule can match. An arrow function, so it passes as a
   * callback without a closure per call.
   *
   * @param {RuleRecord} record
   * @return {string[] | null}
   */
  elementKeysOf = (record) => record.elementKeys(this.#elementKeyOf);

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
   * Appends selectors of `source` to the rule's selector list, keeping its
   * vendor prefix profile in step.
   *
   * @param {RuleRecord} record
   * @param {string[]} selectors some of the selectors of `source`, in the
   * order of their first occurrence there
   * @param {readonly number[]} ids the id of each of `selectors`
   * @return {readonly string[] | null} the element keys the selectors add, or
   * null when the rule's elements are not listed
   */
  addSelectors(record, selectors, ids) {
    return record.addSelectors(
      selectors,
      ids,
      this.#lookup,
      this.#elementKeyOf
    );
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
   * Gives `later` the selectors of `earlier`, which stands before it and is
   * dropped by the caller.
   *
   * @param {RuleRecord} later
   * @param {RuleRecord} earlier
   */
  absorbEarlier(later, earlier) {
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
