import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SelectorIds } from '../../../../../src/passes/ir/selectorIds.js';
import {
  absorbEarlier,
  addSelectors,
} from '../../../../../src/passes/merge/lib/rules/selectorList.js';
import {
  compatibleOf,
  elementKeysOf,
  vendorSummaryOf,
} from '../../../../../src/passes/merge/lib/rules/selectorReads.js';
import { foldedRules } from './summaryFixtures.js';
import { selectorIdsOf } from './selectorIdsOf.js';

/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */
/** @import {TokenLists} from '../../../../../src/passes/ir/tokenLists.js' */

const browsers = ['chrome 120', 'ie 11'];

/**
 * The three summaries of the rule at `index`, read through the functions that
 * the merge uses.
 *
 * @param {BlockRecords} records
 * @param {number} index
 */
function summariesOf(records, index) {
  return {
    compatible: compatibleOf(records, index),
    vendor: vendorSummaryOf(records, index),
    elementKeys: elementKeysOf(records, index),
  };
}

/**
 * Asserts that two rules have the same summaries. The vendor summary holds
 * private fields, so it compares through `sameAs`.
 *
 * @param {ReturnType<typeof summariesOf>} actual
 * @param {ReturnType<typeof summariesOf>} expected
 */
function assertSameSummaries(actual, expected) {
  assert.equal(actual.compatible, expected.compatible);
  assert.ok(actual.vendor.sameAs(expected.vendor));
  assert.deepEqual(actual.elementKeys, expected.elementKeys);
}

const COMPATIBLE = ['a', '.b', 'a.c > d', 'ul li:first-child'];
const VENDOR = ['::-webkit-scrollbar', 'a:-moz-focusring', '.x::-ms-clear'];
const KEYED = ['div', 'span.a', '#id', '*', '.plain'];

/**
 * The ids of `selectors` in the table of `tokenLists`.
 *
 * @param {TokenLists} tokenLists
 * @param {string[]} selectors
 */
const idsIn = (tokenLists, selectors) =>
  selectorIdsOf(new SelectorIds(), tokenLists, selectors);

test('a list extended by addSelectors has the summaries of the whole list', () => {
  const first = [...COMPATIBLE, ...KEYED];
  const folded = foldedRules(`${first.join(',')}{}`, browsers);
  const [index] = folded.rules;
  // Read before the edit, so the edit extends the summaries of the list.
  summariesOf(folded.records, index);
  addSelectors(
    folded.records,
    index,
    VENDOR,
    idsIn(folded.state.tokenLists, VENDOR),
    folded.state.tokenLists,
    browsers
  );
  const whole = foldedRules(`${[...first, ...VENDOR].join(',')}{}`, browsers);
  assertSameSummaries(
    summariesOf(folded.records, index),
    summariesOf(whole.records, whole.rules[0])
  );
});

test('a list that absorbs an earlier list has the summaries of the whole list', () => {
  const earlierSelectors = [...VENDOR, ...KEYED];
  const laterSelectors = [...COMPATIBLE, 'p:-ms-input-placeholder'];
  const folded = foldedRules(
    `${earlierSelectors.join(',')}{}${laterSelectors.join(',')}{}`,
    browsers
  );
  const [earlier, later] = folded.rules;
  summariesOf(folded.records, earlier);
  summariesOf(folded.records, later);
  absorbEarlier(folded.records, later, earlier);
  const whole = foldedRules(
    `${[...earlierSelectors, ...laterSelectors].join(',')}{}`,
    browsers
  );
  assertSameSummaries(
    summariesOf(folded.records, later),
    summariesOf(whole.records, whole.rules[0])
  );
});
