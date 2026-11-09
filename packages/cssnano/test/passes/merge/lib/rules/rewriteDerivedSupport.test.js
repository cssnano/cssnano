import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import merge from '#passes/merge';
import { isDerived } from '../../../../../src/passes/merge/lib/longhand/isFallback.js';

// Four equal sides, which the first longhand round turns into derived
// `border-color`, `border-style` and `border-width` declarations.
const SIDES =
  'border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red';

/**
 * @param {string} css
 * @param {string} selector
 * @return {Promise<boolean[]>} whether each `border-*` declaration of the rule is derived
 */
async function derivedBorders(css, selector) {
  const { root } = await postcss([merge()]).process(css, { from: undefined });
  const rules = root.nodes.filter((node) => node.selector === selector);
  assert.equal(rules.length, 1, `one rule has the selector ${selector}`);
  const borders = rules[0].nodes.filter((node) =>
    node.prop.startsWith('border-')
  );
  assert.ok(borders.length > 0, 'the rule holds the derived declarations');
  return borders.map(isDerived);
}

test('a merged rule still derives a declaration the first longhand round derived', async () => {
  assert.ok(
    (await derivedBorders(`a{${SIDES}}b{${SIDES}}`, 'a,b')).every(Boolean)
  );
});

test('the leftover of the earlier rule still derives a declaration the first longhand round derived', async () => {
  assert.ok(
    (
      await derivedBorders(
        `a{${SIDES};color:green}b{color:green;margin:0}`,
        'a'
      )
    ).every(Boolean)
  );
});

test('the leftover of the later rule still derives a declaration the first longhand round derived', async () => {
  assert.ok(
    (
      await derivedBorders(
        `a{color:green;margin:0}b{color:green;${SIDES}}`,
        'b'
      )
    ).every(Boolean)
  );
});

test('the leftover of a follower still derives a declaration the first longhand round derived', async () => {
  assert.ok(
    (
      await derivedBorders(
        `a{color:green;margin:0}b{color:green;margin:1px}c{color:green;${SIDES}}`,
        'c'
      )
    ).every(Boolean)
  );
});
