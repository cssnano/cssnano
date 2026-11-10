/** @import {SelectorIds} from '../../../../../src/passes/ir/selectorIds.js' */

/**
 * The ids of a rule's selectors, interned by `selectorIds` in the order given,
 * as the build gives a rule its ids. Rules that compare must share one interner.
 *
 * @param {SelectorIds} selectorIds
 * @param {readonly string[]} selectors
 * @return {number[]}
 */
export function selectorIdsOf(selectorIds, selectors) {
  return selectors.map((selector) => selectorIds.idOf(selector));
}
