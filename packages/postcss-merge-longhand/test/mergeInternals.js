import { test, suite } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { reduceBorder } from '../src/lib/decl/borderReducer.js';
import mergeRules from '../src/lib/mergeRules.js';

/**
 * Tests merge correctness without `index.js`'s size guard.
 * Unlike `test/borders.js`, which only verifies shorthand expansion,
 * this asserts the merge result—even if a wrong answer is shorter.
 *
 * @param {string} css one rule
 * @return {string}
 */
function mergeBorders(css) {
  const root = postcss.parse(css);
  const rule = /** @type {import('postcss').Rule} */ (root.first);

  reduceBorder(rule);

  return root.toString();
}

suite('side shorthand merge positioning', () => {
  test('keeps the side a longhand belongs to when merging into border-color', () => {
    assert.strictEqual(
      mergeBorders(
        'a{border:1px solid red;border-left:solid;border-color:currentcolor}'
      ),
      'a{border:1px solid;border-left:solid}'
    );
  });

  test('does not move a side shorthand past a component shorthand that overrode it', () => {
    assert.strictEqual(
      mergeBorders(
        'a{border:medium none #fff;border-left:thick;border:solid #abc123;border-width:1px medium 1px 0;border-left:1px}'
      ),
      'a{border:1px solid #abc123;border-right-width:medium;border-left:1px}'
    );
  });
});

const sideShorthands = [
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
];

/**
 * @param {string} css one rule
 * @return {number} how many times `mergeRules` offers the merge
 */
function offeredMerges(css) {
  const root = postcss.parse(css);
  let offers = 0;

  mergeRules(
    /** @type {import('postcss').Rule} */ (root.first),
    sideShorthands,
    () => {
      offers++;
      return false;
    }
  );

  return offers;
}

/* border-top and border-color cross: both affect the same CSS values
 * (top-color), creating an order-dependent conflict the property names
 * don't reveal. arePropertiesConflicting cannot detect this; only
 * arePropertiesCrossing can. A merge takes the source position of its
 * last member, so a crossing property blocks it only if positioned after
 * that member. */

suite('crossing property merge blocking', () => {
  test('refuses a merge that would move a side shorthand past a crossing one', () => {
    assert.strictEqual(
      offeredMerges(
        'a{border-top:1px solid red;border-right:1px solid red;border-color:blue;border-bottom:1px solid red;border-left:1px solid red}'
      ),
      0
    );
  });

  test('allows a merge whose crossing shorthand already comes first', () => {
    assert.strictEqual(
      offeredMerges(
        'a{border-color:blue;border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red}'
      ),
      1
    );
  });
});
