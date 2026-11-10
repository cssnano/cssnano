/** @import {SelectorIds} from '../../../../../src/passes/ir/selectorIds.js' */
/** @import {TokenLists, TokenListId} from '../../../../../src/passes/ir/tokenLists.js' */
import { selectorInfoOf } from '../../../../../src/passes/merge/lib/rules/ensureCompatibility.js';
import { elementKeyOf } from '../../../../../src/passes/merge/lib/rules/elementKeys.js';

/** @import {SelectorInfo} from '../../../../../src/passes/merge/lib/rules/ensureCompatibility.js' */

/**
 * The ids of a rule's selectors, interned by `selectorIds` in the order given,
 * as the build gives a rule its ids. Rules that compare must share one
 * interner and one table of lists, which keeps the token list of each new
 * selector.
 *
 * @param {SelectorIds} selectorIds
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} selectors
 * @return {TokenListId[]}
 */
export function selectorIdsOf(selectorIds, tokenLists, selectors) {
  return selectors.map((selector) => selectorIds.idOf(tokenLists, selector));
}

/**
 * The compatibility facts of the ids of a table of lists, for the browsers.
 *
 * @param {TokenLists} tokenLists
 * @param {readonly string[]} browsers
 * @return {(id: TokenListId) => SelectorInfo}
 */
export function factsOfIds(tokenLists, browsers) {
  return (id) => selectorInfoOf(tokenLists.get(id), browsers);
}

/**
 * The element key of each id of a table of lists.
 *
 * @param {TokenLists} tokenLists
 * @return {(id: TokenListId) => string | null}
 */
export function elementKeyOfIds(tokenLists) {
  return (id) => elementKeyOf(tokenLists.get(id));
}
