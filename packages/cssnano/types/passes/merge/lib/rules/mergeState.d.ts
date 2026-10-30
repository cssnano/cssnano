import type { Declaration, Rule } from 'postcss';
import type { RangePiece } from '../../../../values/joinRanges.js';
import type { TextTable } from '../../../../values/textTable.js';
import type { PropertyTable } from '../../../ir/propertyTable.js';
import type { RuleMeta } from './ruleMeta.js';
import type { RuleDeclarationKeys } from './ruleMeta.js';
import type { BlockRecord, BlockRecords } from './blockRecords.js';
/** @import {Declaration, Rule} from 'postcss' */
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {RangePiece} from '../../../../values/joinRanges.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */
/** @import {PropertyTable} from '../../../ir/propertyTable.js' */
/** @import {RuleMeta} from './ruleMeta.js' */
/** @import {RuleDeclarationKeys} from './ruleMeta.js' */
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
     * @return {RuleMeta}
     */
    meta(rule: Rule): RuleMeta;
    /**
     * The elements the rule can match. An arrow function, so it passes as a
     * callback without a closure per call.
     *
     * @param {Rule} rule
     * @return {string[] | null}
     */
    elementKeysOf: (rule: Rule) => string[] | null;
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
     * @param {Rule} rule
     * @return {RuleDeclarationKeys}
     */
    declarationKeysOf(rule: Rule): RuleDeclarationKeys;
    /**
     * Records that every selector of the rule is compatible with the target
     * browsers, so `canMerge` does not check them again. The caller must have
     * established it: a rule built from selectors that passed `canMerge`
     * qualifies, since a list is compatible exactly when each selector is.
     *
     * @param {Rule} rule
     */
    markCompatible(rule: Rule): void;
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
     * @param {Rule} rule
     * @param {string[]} selectors some of the selectors of `source`, in the
     * order of their first occurrence there
     * @param {Rule} source
     * @return {readonly string[] | null} the element keys the selectors add, or
     * null when the rule's elements are not listed
     */
    addSelectors(rule: Rule, selectors: string[], source: Rule): readonly string[] | null;
    /**
     * The token range of each selector of the rule, read from the text table
     * without tokenizing, or null when the table does not hold them.
     *
     * @param {Rule} rule
     * @return {RangePiece[] | null}
     */
    piecesOf(rule: Rule): RangePiece[] | null;
    /**
     * Sets the selector text of a rule from its list. Its tokens are stored at
     * the end of the run, so a chain of merges into one rule stores them once.
     *
     * @param {Rule} rule
     */
    spellSelectors(rule: Rule): void;
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
     * @param {Rule} later
     * @param {Rule} earlier
     */
    absorbEarlier(later: Rule, earlier: Rule): void;
    /**
     * The block whose child list holds the rule's slot. It is where the rule
     * stands, which can differ from its PostCSS parent during a sweep.
     *
     * @param {Rule} rule
     * @return {BlockRecord}
     */
    blockOf(rule: Rule): BlockRecord;
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
    canMerge(ruleA: Rule, ruleB: Rule, blockA?: BlockRecord, blockB?: BlockRecord): boolean;
}
//# sourceMappingURL=mergeState.d.ts.map