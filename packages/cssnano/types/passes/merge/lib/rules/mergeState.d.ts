import type { RangePiece } from '../../../../values/joinRanges.js';
import type { RuleRecord } from './ruleRecord.js';
import type { BlockRecords } from './blockRecords.js';
import type { BlockRecord } from './blockRecord.js';
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {RuleRecord} from './ruleRecord.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {BlockRecord} from './blockRecord.js' */
/**
 * The state shared by every merge of one stylesheet.
 */
export default class MergeState {
    #private;
    /**
     * The block and rule records of the stylesheet. The driver builds them, and
     * `runMerge` sets them before any edit reads them.
     *
     * @type {BlockRecords}
     */
    records: BlockRecords;
    /**
     * @param {readonly string[]} browsers
     * @param {import('../../../ir/runContext.js').RunContext} [context] the run's state, shared with dedupe
     */
    constructor(browsers: readonly string[], context?: import('../../../ir/runContext.js').RunContext);
    /**
     * The elements the rule can match. An arrow function, so it passes as a
     * callback without a closure per call.
     *
     * @param {RuleRecord} record
     * @return {string[] | null}
     */
    elementKeysOf: (record: RuleRecord) => string[] | null;
    /**
     * The ids of the run's declarations: equal declarations, with the same
     * property, value, importance and hack prefix, share an id.
     *
     * @return {import('../../../ir/declarationKey.js').DeclarationKeys}
     */
    get declarationIds(): import('../../../ir/declarationKey.js').DeclarationKeys;
    /**
     * Appends selectors of `source` to the rule's selector list, keeping its
     * vendor prefix profile and its token ranges in step.
     *
     * @param {RuleRecord} record
     * @param {string[]} selectors some of the selectors of `source`, in the
     * order of their first occurrence there
     * @param {readonly number[]} ids the id of each of `selectors`
     * @param {RuleRecord} source
     * @return {readonly string[] | null} the element keys the selectors add, or
     * null when the rule's elements are not listed
     */
    addSelectors(record: RuleRecord, selectors: string[], ids: readonly number[], source: RuleRecord): readonly string[] | null;
    /**
     * The token range of each selector of the rule, read from the tokens the
     * record holds without tokenizing, or null when it holds none.
     *
     * @param {RuleRecord} record
     * @return {RangePiece[] | null}
     */
    piecesOf(record: RuleRecord): RangePiece[] | null;
    /**
     * Sets the selector of a rule from its list and marks it, so write-back
     * assigns the text. The tokens of the old text are dropped.
     *
     * @param {RuleRecord} record
     */
    spellSelectors(record: RuleRecord): void;
    /**
     * Gives the record the tokens of a rule joined from the selectors of `first`
     * and `second`, in that order, with a comma between each, as `join()` writes it.
     *
     * @param {RuleRecord} record the merged rule, whose selector is the join
     * @param {RuleRecord} first
     * @param {RuleRecord} second
     */
    storeJoined(record: RuleRecord, first: RuleRecord, second: RuleRecord): void;
    /**
     * Gives `later` the selectors of `earlier`, which stands before it and is
     * dropped by the caller.
     *
     * @param {RuleRecord} later
     * @param {RuleRecord} earlier
     */
    absorbEarlier(later: RuleRecord, earlier: RuleRecord): void;
    /**
     * The container whose chain holds the rule: a block, or a rule that nests.
     * It is where the rule stands, which can differ from its PostCSS parent
     * during a sweep. A rule that left the stylesheet stands in no container.
     *
     * @param {RuleRecord} record
     * @return {BlockRecord | RuleRecord}
     */
    blockOf(record: RuleRecord): BlockRecord | RuleRecord;
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
    canMerge(recordA: RuleRecord, recordB: RuleRecord, blockA?: number, blockB?: number): boolean;
}
//# sourceMappingURL=mergeState.d.ts.map