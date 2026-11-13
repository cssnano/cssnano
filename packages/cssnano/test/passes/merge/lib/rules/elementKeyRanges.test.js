import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the key module loads.
const { counter } = await import('../../../../../../../util/countTokenize.js');
const { tokens: tokenize } = await import('../../../../../src/utils/value.js');
const { elementKeyOf } =
  await import('../../../../../src/passes/ir/elementKeys.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

// The selectors of the element key cases in elementKeys.test.js.
const selectors = [
  'H1',
  'div span',
  'div > p',
  'h1+p',
  'h1~em',
  'h1::before',
  'h1::BEFORE',
  'svg|h1',
  '*|h1',
  '|h1',
  '.a',
  '*',
  '#id',
  ':is(h1)',
];

suite('elementKeyOf reads a selector from its token list', () => {
  test('elementKeyOf gives the lowercase type of the last compound of a token list', () => {
    assert.equal(elementKeyOf(tokenize('div > H1::BEFORE')), 'h1::before');
  });

  test('elementKeyOf gives null for a token list whose last compound has a class', () => {
    assert.equal(elementKeyOf(tokenize('div .a')), null);
  });

  test("elementKeyOf reads a selector's token list without tokenizing", () => {
    const lists = selectors.map((selector) => tokenize(selector));
    const before = tokenizeTotal();
    for (const list of lists) elementKeyOf(list);
    assert.equal(tokenizeTotal() - before, 0);
  });
});
