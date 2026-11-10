import type { TokenListId, TokenLists } from '../../../ir/tokenLists.js';
import type { BlockRecords } from './blockRecords.js';
import { VendorPrefixSummary } from './vendorPrefixSummary.js';
import type { RuleElementKeys } from './elementKeys.js';
/** @import {RuleElementKeys} from './elementKeys.js' */
/**
 * The ids of a rule whose list has moved to another rule. It is frozen, so a
 * push onto it throws and an edit of the moved rule fails at once.
 *
 * @type {TokenListId[]}
 */
export declare const NO_SELECTORS: TokenListId[];
export type WritableSummaries = {
    selectorIds: TokenListId[];
    compatible: boolean;
    vendor: VendorPrefixSummary;
    elementKeys: RuleElementKeys | null;
    marked: boolean;
};
/**
 * The selector list of a rule, with the facts folded from its ids. It is the
 * base of `RuleRecord`, not a member of it, so a rule is one object with one
 * layout. The summaries are kept in step by the functions of this module.
 */
export declare class SelectorList {
    /**
     * The interned id of each selector, in order. A selector's id is the same
     * for every rule that holds an equal item. It is read-only: only the
     * functions of this module move or append ids.
     *
     * @readonly
     * @type {readonly TokenListId[]}
     */
    readonly selectorIds: readonly TokenListId[];
    /**
     * Whether every selector suits the target browsers.
     *
     * @readonly
     * @type {boolean}
     */
    readonly compatible: boolean;
    /**
     * The vendor prefix summary of the selectors.
     *
     * @readonly
     * @type {VendorPrefixSummary}
     */
    readonly vendor: VendorPrefixSummary;
    /**
     * The element keys of the selectors, or null when a selector has none. The
     * list is empty when the rule has no selectors.
     *
     * @readonly
     * @type {RuleElementKeys | null}
     */
    readonly elementKeys: RuleElementKeys | null;
    /**
     * Whether an edit changed the rule's list, so write-back must write its
     * selector. Every edit that changes the ids sets it.
     *
     * @readonly
     * @type {boolean}
     */
    readonly marked: boolean;
    /**
     * @param {readonly TokenListId[]} selectorIds the interned id of each selector
     */
    constructor(selectorIds: readonly TokenListId[]);
}
/**
 * Folds the summaries of every rule the root reaches. Every read of a summary
 * then finds it filled, so no read writes a field.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {void}
 */
export declare function fillSummaries(records: BlockRecords, tokenLists: TokenLists, browsers: readonly string[]): void;
/**
 * The rules the root reaches, at any depth, in document order.
 *
 * @param {BlockRecords} records
 * @return {Generator<SelectorList>}
 */
export declare function reachedRules(records: BlockRecords): Generator<SelectorList>;
/**
 * Folds the facts of the selectors from index `from` on into a rule's
 * summaries, which must already cover the selectors before them.
 *
 * @param {SelectorList} list
 * @param {number} from
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {void}
 */
export declare function extendSummaries(list: SelectorList, from: number, tokenLists: TokenLists, browsers: readonly string[]): void;
/**
 * Appends selectors to a placed rule, with their ids and facts.
 *
 * @param {BlockRecords} records
 * @param {number} index the rule's index
 * @param {readonly TokenListId[]} ids the id of each selector appended
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {readonly string[] | null} the element keys the selectors add to
 * those listed, or null when the elements are not listed
 */
export declare function addSelectors(records: BlockRecords, index: number, ids: readonly TokenListId[], tokenLists: TokenLists, browsers: readonly string[]): readonly string[] | null;
/**
 * Gives `later` the selectors of `earlier`, which stands before it and is
 * dropped by the caller. Its summaries combine without a fact read: the
 * element keys of the earlier selectors come first.
 *
 * @param {BlockRecords} records
 * @param {number} laterIndex
 * @param {number} earlierIndex
 * @return {void}
 */
export declare function absorbEarlier(records: BlockRecords, laterIndex: number, earlierIndex: number): void;
/**
 * The summaries of a rule made from two rules' selectors, in order: the first
 * rule's ids, then the second's. `target` holds no id of the two yet, and it
 * must be given its ids, then `extendSummaries` for any ids after them.
 *
 * @param {SelectorList} target a new rule, unplaced, whose ids are the two rules' ids
 * @param {SelectorList} first
 * @param {SelectorList} second
 * @return {void}
 */
export declare function combineSummaries(target: SelectorList, first: SelectorList, second: SelectorList): void;
//# sourceMappingURL=selectorList.d.ts.map