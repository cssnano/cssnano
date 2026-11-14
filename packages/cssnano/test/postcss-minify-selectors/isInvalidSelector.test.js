import assert from 'node:assert/strict';
import { test } from 'node:test';

// The counter must hook the tokenizer before the parser loads it, so the
// parser loads after it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { selectorRanges } = await import('../../../../util/selectorRanges.js');
const { tokens } = await import('../../src/utils/value.js');
const { isInvalidSelector } =
  await import('../../src/plugins/postcss-minify-selectors/lib/isInvalidSelector.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

test("isInvalidSelector reads a rule's selector tokens, without tokenizing", () => {
  const root = postcss.parse('.a, [x=] {}');
  const rule = root.first;
  const list = tokens(rule.selector);
  const [, second] = selectorRanges(list);
  const before = tokenizeTotal();
  isInvalidSelector(rule.selector, list, second.start, second.end);
  assert.equal(tokenizeTotal() - before, 0);
});

test("isInvalidSelector judges a rule's selector range by the selector it spells", () => {
  const root = postcss.parse('.a, [x=] {}');
  const rule = root.first;
  const list = tokens(rule.selector);
  const [first, second] = selectorRanges(list);
  assert.equal(
    isInvalidSelector(rule.selector, list, first.start, first.end),
    false
  );
  assert.equal(
    isInvalidSelector(rule.selector, list, second.start, second.end),
    true
  );
});
