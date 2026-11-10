import { selectorIdsOf, factsOfIds, elementKeyOfIds } from './selectorIdsOf.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import { SelectorIds } from '../../../../../src/passes/ir/selectorIds.js';
import { TokenLists } from '../../../../../src/passes/ir/tokenLists.js';

const browsers = ['chrome 120', 'ie 11'];

/**
 * A rule of `selectors`, its ids interned into `selectorIds` and `tokenLists`.
 *
 * @param {SelectorIds} selectorIds
 * @param {TokenLists} tokenLists
 * @param {string[]} selectors
 * @return {RuleRecord}
 */
function ruleOf(selectorIds, tokenLists, selectors) {
  return new RuleRecord(
    [...selectors],
    selectors.join(','),
    selectorIdsOf(selectorIds, tokenLists, selectors)
  );
}

/**
 * The three summaries of a rule, read through the lookups of its table, as
 * plain values that compare with `deepStrictEqual`.
 *
 * @param {RuleRecord} rule
 * @param {TokenLists} tokenLists
 */
function summariesOf(rule, tokenLists) {
  return {
    compatible: rule.compatible(factsOfIds(tokenLists, browsers)),
    vendor: rule.vendorProfile(factsOfIds(tokenLists, browsers)),
    elementKeys: rule.elementKeys(elementKeyOfIds(tokenLists)),
  };
}

const COMPATIBLE = ['a', '.b', 'a.c > d', 'ul li:first-child'];
const VENDOR = ['::-webkit-scrollbar', 'a:-moz-focusring', '.x::-ms-clear'];
const KEYED = ['div', 'span.a', '#id', '*', '.plain'];

test('a list extended by addSelectors has the summaries of the whole list', () => {
  const selectorIds = new SelectorIds();
  const tokenLists = new TokenLists();
  const first = [...COMPATIBLE, ...KEYED];
  const rule = ruleOf(selectorIds, tokenLists, first);
  // Read before the edit, so the edit extends filled summaries.
  summariesOf(rule, tokenLists);
  rule.addSelectors(
    VENDOR,
    selectorIdsOf(selectorIds, tokenLists, VENDOR),
    factsOfIds(tokenLists, browsers),
    elementKeyOfIds(tokenLists)
  );
  const whole = ruleOf(selectorIds, tokenLists, [...first, ...VENDOR]);
  assert.deepStrictEqual(
    summariesOf(rule, tokenLists),
    summariesOf(whole, tokenLists)
  );
});

test('a list that absorbs an earlier list has the summaries of the whole list', () => {
  const selectorIds = new SelectorIds();
  const tokenLists = new TokenLists();
  const earlierSelectors = [...VENDOR, ...KEYED];
  const laterSelectors = [...COMPATIBLE, 'p:-ms-input-placeholder'];
  const earlier = ruleOf(selectorIds, tokenLists, earlierSelectors);
  const later = ruleOf(selectorIds, tokenLists, laterSelectors);
  summariesOf(earlier, tokenLists);
  summariesOf(later, tokenLists);
  later.absorbEarlier(
    earlier,
    factsOfIds(tokenLists, browsers),
    elementKeyOfIds(tokenLists)
  );
  const whole = ruleOf(selectorIds, tokenLists, [
    ...earlierSelectors,
    ...laterSelectors,
  ]);
  assert.deepStrictEqual(
    summariesOf(later, tokenLists),
    summariesOf(whole, tokenLists)
  );
});
