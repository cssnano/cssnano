import type { TokenListId, TokenLists } from '../../../ir/tokenLists.js';
import type { BlockRecords } from './blockRecords.js';
/** @import {TokenListId, TokenLists} from '../../../ir/tokenLists.js' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {RuleElementKeys} from './elementKeys.js' */
import { VendorPrefixSummary } from './vendorPrefixSummary.js';
/** @import {SelectorList} from './selectorList.js' */
/**
 * The reads of a rule's selector list. Each reads the summaries that
 * `selectorList.js` folds, or the ids, and writes nothing.
 */
/**
 * Whether the stored summaries of every rule the root reaches equal the fold
 * of its ids. Writes nothing; the tree check calls it under consistency checks.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {boolean}
 */
export declare function summariesHold(records: BlockRecords, tokenLists: TokenLists, browsers: readonly string[]): boolean;
/**
 * Whether every selector of a rule suits the target browsers.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {boolean}
 */
export declare function compatibleOf(records: BlockRecords, index: number): boolean;
/**
 * @param {BlockRecords} records
 * @param {number} index
 * @return {VendorPrefixSummary}
 */
export declare function vendorSummaryOf(records: BlockRecords, index: number): VendorPrefixSummary;
/**
 * The elements a rule can match, as `elementKeyOf` in `elementKeys.js`
 * describes them, or null when any selector has no key or there are none,
 * which must not read as a rule that writes to no element.
 *
 * @param {BlockRecords} records
 * @param {number} index
 * @return {string[] | null}
 */
export declare function elementKeysOf(records: BlockRecords, index: number): string[] | null;
/**
 * Whether two rules have the same selectors in the same order. A selector holds
 * no top-level comma, so two lists are equal exactly when their ids are.
 *
 * @param {BlockRecords} records
 * @param {number} firstIndex
 * @param {number} secondIndex
 * @return {boolean}
 */
export declare function hasSameSelectors(records: BlockRecords, firstIndex: number, secondIndex: number): boolean;
/**
 * The key of a list of selectors: its ids joined by commas.
 *
 * @param {readonly TokenListId[]} ids
 * @return {string}
 */
export declare function listKey(ids: readonly TokenListId[]): string;
/**
 * The length of the text of one selector, which is its token list's text.
 *
 * @param {TokenLists} tokenLists
 * @param {TokenListId} id
 * @return {number}
 */
export declare function selectorTextLength(tokenLists: TokenLists, id: TokenListId): number;
/**
 * The length of the selectors' texts joined by bare commas: the sum of the
 * texts, with one comma less than the count.
 *
 * @param {TokenLists} tokenLists
 * @param {readonly TokenListId[]} ids
 * @return {number}
 */
export declare function listTextLength(tokenLists: TokenLists, ids: readonly TokenListId[]): number;
//# sourceMappingURL=selectorReads.d.ts.map