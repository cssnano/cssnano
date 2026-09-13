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

suite(
  'box and border-radius candidate scan avoidance and anchor placement',
  () => {
    test('reduceBox avoids rule.index scans when selecting the latest candidate', async () => {
      const { reduceBox } = await import('../src/lib/decl/boxReducer.js');
      const root = postcss.parse(
        'a{margin-left:10px;color:red;margin-bottom:20px;font-size:14px;margin-right:30px;margin-top:40px}'
      );
      const rule = /** @type {import('postcss').Rule} */ (root.first);

      let indexCalls = 0;
      const origIndex = rule.index.bind(rule);
      rule.index = (node) => {
        indexCalls++;
        return origIndex(node);
      };

      reduceBox(rule, 'margin');

      // PostCSS insertAfter calls rule.index twice (2), and removing 4 declarations calls it 4 times (4).
      // The candidate selection loop should NOT call rule.index (0 calls instead of 8).
      assert.strictEqual(indexCalls, 6);
      assert.strictEqual(
        root.toString(),
        'a{color:red;font-size:14px;margin:40px 30px 20px 10px}'
      );
    });

    test('reduceBorderRadius avoids rule.index scans when selecting the latest candidate', async () => {
      const { reduceBorderRadius } =
        await import('../src/lib/decl/borderRadiusReducer.js');
      const root = postcss.parse(
        'a{border-bottom-left-radius:40px;color:red;border-bottom-right-radius:30px;border-top-right-radius:20px;border-top-left-radius:10px}'
      );
      const rule = /** @type {import('postcss').Rule} */ (root.first);

      let indexCalls = 0;
      const origIndex = rule.index.bind(rule);
      rule.index = (node) => {
        indexCalls++;
        return origIndex(node);
      };

      reduceBorderRadius(rule);

      // PostCSS insertAfter calls rule.index twice (2), and removing 4 declarations calls it 4 times (4).
      // The candidate selection loop should NOT call rule.index (0 calls instead of 8).
      assert.strictEqual(indexCalls, 6);
      assert.strictEqual(
        root.toString(),
        'a{color:red;border-radius:10px 20px 30px 40px}'
      );
    });

    test('reduceBox avoids rule.index scans when fallback candidates are present', async () => {
      const { reduceBox } = await import('../src/lib/decl/boxReducer.js');
      const root = postcss.parse(
        'a{margin-left:10px;margin-left:calc(10px + 1em);margin-bottom:20px;color:red;margin-right:30px;margin-top:40px}'
      );
      const rule = /** @type {import('postcss').Rule} */ (root.first);

      let indexCalls = 0;
      const origIndex = rule.index.bind(rule);
      rule.index = (node) => {
        indexCalls++;
        return origIndex(node);
      };

      reduceBox(rule, 'margin');

      // PostCSS insertAfter calls rule.index twice (2), and removing 4 declarations calls it 4 times (4).
      // The candidate selection loop should NOT call rule.index (0 calls instead of 8).
      assert.strictEqual(indexCalls, 6);
      assert.strictEqual(
        root.toString(),
        'a{margin-left:10px;color:red;margin:40px 30px 20px calc(10px + 1em)}'
      );
    });

    test('reduceBorderRadius avoids rule.index scans when fallback candidates are present', async () => {
      const { reduceBorderRadius } =
        await import('../src/lib/decl/borderRadiusReducer.js');
      const root = postcss.parse(
        'a{border-top-left-radius:10px;border-top-left-radius:calc(10px + 1em);border-top-right-radius:20px;border-bottom-right-radius:30px;color:red;border-bottom-left-radius:40px}'
      );
      const rule = /** @type {import('postcss').Rule} */ (root.first);

      let indexCalls = 0;
      const origIndex = rule.index.bind(rule);
      rule.index = (node) => {
        indexCalls++;
        return origIndex(node);
      };

      reduceBorderRadius(rule);

      // PostCSS insertAfter calls rule.index twice (2), and removing 4 declarations calls it 4 times (4).
      // The candidate selection loop should NOT call rule.index (0 calls instead of 8).
      assert.strictEqual(indexCalls, 6);
      assert.strictEqual(
        root.toString(),
        'a{border-top-left-radius:10px;color:red;border-radius:calc(10px + 1em) 20px 30px 40px}'
      );
    });
  }
);
