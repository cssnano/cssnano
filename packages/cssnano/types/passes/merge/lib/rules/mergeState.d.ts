import type { TokenListId } from '../../../ir/tokenLists.js';
import type { RuleRecord } from './ruleRecord.js';
import type { BlockRecords } from './blockRecords.js';
import type { BlockRecord } from './blockRecord.js';
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
     * The token lists of the run, which the ids of the records name.
     *
     * @return {import('../../../ir/tokenLists.js').TokenLists}
     */
    get tokenLists(): import('../../../ir/tokenLists.js').TokenLists;
    /**
     * The target browsers, which the selector facts of the run depend on.
     *
     * @return {readonly string[]}
     */
    get browsers(): readonly string[];
    /**
     * The ids of the run's declarations: equal declarations, with the same
     * property, value, importance and hack prefix, share an id.
     *
     * @return {import('../../../ir/declarationKey.js').DeclarationKeys}
     */
    get declarationIds(): import('../../../ir/declarationKey.js').DeclarationKeys;
    /**
     * Appends selectors of `source` to the rule's selector list, keeping its
     * vendor prefix profile in step.
     *
     * @param {RuleRecord} record
     * @param {string[]} selectors some of the selectors of `source`, in the
     * order of their first occurrence there
     * @param {readonly TokenListId[]} ids the id of each of `selectors`
     * @return {readonly string[] | null} the element keys the selectors add, or
     * null when the rule's elements are not listed
     */
    addSelectors(record: RuleRecord, selectors: string[], ids: readonly TokenListId[]): readonly string[] | null;
    /**
     * Sets the selector of a rule from its list, which marks it so write-back
     * assigns the text.
     *
     * @param {RuleRecord} record
     */
    spellSelectors(record: RuleRecord): void;
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