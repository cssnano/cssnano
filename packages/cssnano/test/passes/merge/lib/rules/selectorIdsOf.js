/** @import {SelectorIds} from '../../../../../src/passes/ir/selectorIds.js' */
/** @import {TokenLists, TokenListId} from '../../../../../src/passes/ir/tokenLists.js' */

/** @import {SelectorInfo} from '../../../../../src/passes/ir/ensureCompatibility.js' */

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
