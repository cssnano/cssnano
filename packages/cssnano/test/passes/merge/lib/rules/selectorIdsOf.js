/** @import {SelectorIds} from '../../../../../src/passes/ir/selectorIds.js' */
import { TokenLists } from '../../../../../src/passes/ir/tokenLists.js';
import { selectorInfoOf } from '../../../../../src/passes/merge/lib/rules/ensureCompatibility.js';
import { elementKeyOf } from '../../../../../src/passes/merge/lib/rules/elementKeys.js';
import { tokens as tokenize } from '../../../../../src/utils/value.js';

/** @import {SelectorInfo} from '../../../../../src/passes/merge/lib/rules/ensureCompatibility.js' */

/** @type {WeakMap<SelectorIds, TokenLists>} the token lists of the ids each interner gave */
const listsOf = new WeakMap();

/**
 * The token lists of the ids an interner gave: the list at each id's index
 * spells that id's selector, as the build keeps them.
 *
 * @param {SelectorIds} selectorIds
 * @return {TokenLists}
 */
export function tokenListsOfIds(selectorIds) {
  let lists = listsOf.get(selectorIds);
  if (lists === undefined) {
    lists = new TokenLists();
    listsOf.set(selectorIds, lists);
  }
  return lists;
}

/**
 * The ids of a rule's selectors, interned by `selectorIds` in the order given,
 * as the build gives a rule its ids. Rules that compare must share one
 * interner, which also keeps the token list of each new selector.
 *
 * @param {SelectorIds} selectorIds
 * @param {readonly string[]} selectors
 * @return {number[]}
 */
export function selectorIdsOf(selectorIds, selectors) {
  const lists = tokenListsOfIds(selectorIds);
  return selectors.map((selector) => {
    const id = selectorIds.idOf(selector);
    if (id === lists.length) lists.push(tokenize(selector));
    return id;
  });
}

/**
 * The compatibility facts of the ids an interner gave, for the browsers.
 *
 * @param {SelectorIds} selectorIds
 * @param {readonly string[]} browsers
 * @return {(id: number) => SelectorInfo}
 */
export function factsOfIds(selectorIds, browsers) {
  const lists = tokenListsOfIds(selectorIds);
  return (id) => selectorInfoOf(lists.get(id), browsers);
}

/**
 * The element key of each id an interner gave.
 *
 * @param {SelectorIds} selectorIds
 * @return {(id: number) => string | null}
 */
export function elementKeyOfIds(selectorIds) {
  const lists = tokenListsOfIds(selectorIds);
  return (id) => elementKeyOf(lists.get(id));
}
