import { selectorIdsOf, factsOfIds, elementKeyOfIds } from './selectorIdsOf.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import { SelectorIds } from '../../../../../src/passes/ir/selectorIds.js';

const browsers = ['chrome 120', 'ie 11'];

/**
 * A rule of `selectors`, its ids interned by `selectorIds`.
 *
 * @param {SelectorIds} selectorIds
 * @param {string[]} selectors
 * @return {RuleRecord}
 */
function ruleOf(selectorIds, selectors) {
  return new RuleRecord(
    [...selectors],
    selectors.join(','),
    selectorIdsOf(selectorIds, selectors)
  );
}

/**
 * The three summaries of a rule, read through the lookups of its interner, as
 * plain values that compare with `deepStrictEqual`.
 *
 * @param {RuleRecord} rule
 * @param {SelectorIds} selectorIds
 */
function summariesOf(rule, selectorIds) {
  const lookup = factsOfIds(selectorIds, browsers);
  return {
    compatible: rule.compatible(lookup),
    vendor: rule.vendorProfile(lookup),
    elementKeys: rule.elementKeys(elementKeyOfIds(selectorIds)),
  };
}

/**
 * Reads the summaries of `first` so they are filled, applies `edit` with the
 * rest of the list, and compares the summaries with those of the whole list
 * built at once.
 *
 * @param {string[]} first
 * @param {string[]} rest
 * @param {(rule: RuleRecord, rest: string[], selectorIds: SelectorIds) => void} edit
 */
function assertEditKeepsSummaries(first, rest, edit) {
  const selectorIds = new SelectorIds();
  const rule = ruleOf(selectorIds, first);
  summariesOf(rule, selectorIds);
  edit(rule, rest, selectorIds);
  const whole = ruleOf(selectorIds, [...first, ...rest]);
  assert.deepStrictEqual(
    summariesOf(rule, selectorIds),
    summariesOf(whole, selectorIds)
  );
}

const COMPATIBLE = ['a', '.b', 'a.c > d', 'ul li:first-child'];
const VENDOR = ['::-webkit-scrollbar', 'a:-moz-focusring', '.x::-ms-clear'];
const KEYED = ['div', 'span.a', '#id', '*', '.plain'];

test('a list extended by addSelectors has the summaries of the whole list', () => {
  assertEditKeepsSummaries(
    [...COMPATIBLE, ...KEYED],
    VENDOR,
    (rule, rest, selectorIds) =>
      rule.addSelectors(
        rest,
        selectorIdsOf(selectorIds, rest),
        factsOfIds(selectorIds, browsers),
        elementKeyOfIds(selectorIds)
      )
  );
});

test('a list that absorbs an earlier list has the summaries of the whole list', () => {
  const selectorIds = new SelectorIds();
  const earlierSelectors = [...VENDOR, ...KEYED];
  const laterSelectors = [...COMPATIBLE, 'p:-ms-input-placeholder'];
  const earlier = ruleOf(selectorIds, earlierSelectors);
  const later = ruleOf(selectorIds, laterSelectors);
  summariesOf(earlier, selectorIds);
  summariesOf(later, selectorIds);
  later.absorbEarlier(
    earlier,
    factsOfIds(selectorIds, browsers),
    elementKeyOfIds(selectorIds)
  );
  const whole = ruleOf(selectorIds, [...earlierSelectors, ...laterSelectors]);
  assert.deepStrictEqual(
    summariesOf(later, selectorIds),
    summariesOf(whole, selectorIds)
  );
});
