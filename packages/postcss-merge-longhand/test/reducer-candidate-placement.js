import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';

describe('box and border-radius candidate scan avoidance and anchor placement', () => {
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
});
