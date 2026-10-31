import type { Declaration, Rule } from 'postcss';
import type { RangePiece } from '../../../../values/joinRanges.js';
import type { TextTable } from '../../../../values/textTable.js';
import type { PropertyTable } from '../../../ir/propertyTable.js';
import type { RuleRecord } from './ruleRecord.js';
import type { RuleDeclarationKeys } from './ruleRecord.js';
import type { BlockRecord, BlockRecords } from './blockRecords.js';
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
    #private;
    /**
     * The keys of the property names this stylesheet's merges compare.
     *
     * @type {PropertyTable}
     */
    properties: PropertyTable;
    /**
     * The block and rule records of the stylesheet. `runMerge` sets them before
     * any edit reads them.
     *
     * @type {BlockRecords}
     */
    records: BlockRecords;
    /** @returns {TextTable} the selector tokens the walk stored */
    get textTable(): TextTable;
    /**
     * @param {readonly string[]} browsers
     * @param {import('../../../ir/runContext.js').RunContext} [context] the run's state, shared with dedupe
     */
    constructor(browsers: readonly string[], context?: import('../../../ir/runContext.js').RunContext);
    /**
     * The record of the rule, which the records hold. Under consistency checks
     * a record whose declarations differ from the tree throws.
     *
     * @param {Rule} rule
     * @return {RuleRecord}
     */
    meta(rule: Rule): RuleRecord;
    /**
     * The elements the rule can match. An arrow function, so it passes as a
     * callback without a closure per call.
     *
     * @param {RuleRecord} record
     * @return {string[] | null}
     */
    elementKeysOf: (record: RuleRecord) => string[] | null;
    /**
     * The elements of the rule that stands at a node, as `elementKeysOf` gives
     * them. An arrow function, for the callers that hold only the nodes of
     * declarations.
     *
     * @param {Rule} rule
     * @return {string[] | null}
     */
    elementKeysOfNode: (rule: Rule) => string[] | null;
    /**
     * Numbers declarations so equal ones, with the same property, value,
     * importance and hack prefix, share a key for the whole run. An arrow
     * function, so it passes as a callback without a closure per call.
     *
     * @param {Declaration} declaration
     * @return {number}
     */
    declarationKey: (declaration: Declaration) => number;
    /**
     * @param {RuleRecord} record
     * @return {RuleDeclarationKeys}
     */
    declarationKeysOf(record: RuleRecord): RuleDeclarationKeys;
    /**
     * Reports a rule a merge created, when the run collects them, so the driver
     * canonicalizes it. A rule no run collects is left alone.
     *
     * @param {Rule} rule
     */
    reportCreated(rule: Rule): void;
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
    addSelectors(record: RuleRecord, selectors: string[], source: RuleRecord): readonly string[] | null;
    /**
     * The token range of each selector of the rule, read from the text table
     * without tokenizing, or null when the table does not hold them.
     *
     * @param {RuleRecord} record
     * @return {RangePiece[] | null}
     */
    piecesOf(record: RuleRecord): RangePiece[] | null;
    /**
     * Sets the selector text of a rule from its list. Its tokens are stored at
     * the end of the run, so a chain of merges into one rule stores them once.
     *
     * @param {RuleRecord} record
     */
    spellSelectors(record: RuleRecord): void;
    /**
     * Stores the tokens of a copy of `rule` made with the rule's selectors. The
     * copy's text is the one PostCSS joined, so the tokens are stored only when
     * they spell it.
     *
     * @param {Rule} rule
     * @param {Rule} clone
     */
    storeClone(rule: Rule, clone: Rule): void;
    /**
     * Stores the tokens of a rule joined from the selectors of `first` and
     * `second`, in that order, with a comma between each, as `join()` writes it.
     *
     * @param {Rule} rule
     * @param {Rule} first
     * @param {Rule} second
     */
    storeJoined(rule: Rule, first: Rule, second: Rule): void;
    /**
     * Stores the tokens of every rule `spellSelectors` set, joined from the
     * pieces its list holds. A rule without pieces keeps its text only, and a
     * reader tokenizes it.
     */
    flushSelectors(): void;
    /**
     * Gives `later` the selectors of `earlier`, which stands before it and is
     * dropped by the caller.
     *
     * @param {RuleRecord} later
     * @param {RuleRecord} earlier
     */
    absorbEarlier(later: RuleRecord, earlier: RuleRecord): void;
    /**
     * The block whose child list holds the rule's slot. It is where the rule
     * stands, which can differ from its PostCSS parent during a sweep.
     *
     * @param {RuleRecord} record
     * @return {BlockRecord}
     */
    blockOf(record: RuleRecord): BlockRecord;
    /**
     * Whether the rules can be merged. `blockA` and `blockB` are the blocks
     * the rules stand in.
     *
     * @param {RuleRecord} recordA
     * @param {RuleRecord} recordB
     * @param {BlockRecord} [blockA]
     * @param {BlockRecord} [blockB]
     * @return {boolean}
     */
    canMerge(recordA: RuleRecord, recordB: RuleRecord, blockA?: BlockRecord, blockB?: BlockRecord): boolean;
}
//# sourceMappingURL=mergeState.d.ts.map