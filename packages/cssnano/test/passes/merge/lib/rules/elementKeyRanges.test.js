import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the key module loads.
const { counter } = await import('../../../../../../../util/countTokenize.js');
const { default: cssnanoUtils } = await import('#utils');
const { selectorPieces } =
  await import('../../../../../src/values/selectorRanges.js');
const { elementKeyOf } =
  await import('../../../../../src/passes/merge/lib/rules/elementKeys.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

// The selectors of the element key cases in elementKeys.test.js, with the
// simple compounds the fast path settles left out of the range contract.
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

/**
 * The token range of a selector that is the only one of its list.
 *
 * @param {string} selector
 * @return {import('../../../../../src/values/selectorRanges.js').RangePiece}
 */
function rangeOf(selector) {
  const [piece] = selectorPieces(cssnanoUtils.tokens(selector), [selector]);
  assert.ok(piece, `no token range for ${selector}`);
  return piece;
}

suite('elementKeyOf reads a selector from its token range', () => {
  test("elementKeyOf gives the same key from a selector's token range as from its text", () => {
    const fromRanges = selectors.map((selector) =>
      elementKeyOf(selector, rangeOf(selector))
    );
    assert.deepEqual(
      fromRanges,
      selectors.map((selector) => elementKeyOf(selector))
    );
  });

  test("elementKeyOf reads a selector's token range without tokenizing", () => {
    const pieces = selectors.map(rangeOf);
    const before = tokenizeTotal();
    for (const [index, selector] of selectors.entries()) {
      elementKeyOf(selector, pieces[index]);
    }
    assert.equal(tokenizeTotal() - before, 0);
  });
});
