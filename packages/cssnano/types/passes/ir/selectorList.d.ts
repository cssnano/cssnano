import type { TokenListId, TokenLists } from './tokenLists.js';
import type { BlockRecords } from './blockRecords.js';
import type { RuleRecord } from './ruleRecord.js';
import { VendorPrefixSummary } from './vendorPrefixSummary.js';
import type { RuleElementKeys } from './elementKeys.js';
/**
 * The vendor summary of a rule whose facts are not folded yet. It is shared,
 * so nothing may add to it: `fillSummaries` gives each rule its own.
 */
export declare const UNFOLDED_VENDOR: VendorPrefixSummary;
export type WritableSummaries = {
    selectorIds: TokenListId[];
    writtenList: number;
    compatible: boolean;
    vendor: VendorPrefixSummary;
    elementKeys: RuleElementKeys | null;
    marked: boolean;
};
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
 * @return {Generator<RuleRecord>}
 */
export declare function reachedRules(records: BlockRecords): Generator<RuleRecord>;
/**
 * Gives a rule the summaries of its whole list, folded from its ids.
 *
 * @param {RuleRecord} list
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {void}
 */
export declare function fillRule(list: RuleRecord, tokenLists: TokenLists, browsers: readonly string[]): void;
/**
 * Folds the facts of the selectors from index `from` on into a rule's
 * summaries, which must already cover the selectors before them.
 *
 * @param {RuleRecord} list
 * @param {number} from
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {void}
 */
export declare function extendSummaries(list: RuleRecord, from: number, tokenLists: TokenLists, browsers: readonly string[]): void;
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
 * @param {RuleRecord} target a new rule, unplaced, whose ids are the two rules' ids
 * @param {RuleRecord} first
 * @param {RuleRecord} second
 * @return {void}
 */
export declare function combineSummaries(target: RuleRecord, first: RuleRecord, second: RuleRecord): void;
//# sourceMappingURL=selectorList.d.ts.map