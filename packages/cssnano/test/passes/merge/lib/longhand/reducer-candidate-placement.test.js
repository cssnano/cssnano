import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';

/** @param {import('postcss').Rule} rule */
function trackIndexCalls(rule) {
  let indexCalls = 0;
  const origIndex = rule.index.bind(rule);
  rule.index = (node) => {
    indexCalls++;
    return origIndex(node);
  };
  return () => indexCalls;
}

describe('box and border-radius candidate scan avoidance and anchor placement', () => {
  test('reduceBox avoids rule.index scans when selecting the latest candidate', async () => {
    const { reduceBoxRuns } = await import('./helpers/reduceRuns.js');
    const root = postcss.parse(
      'a{margin-left:10px;color:red;margin-bottom:20px;font-size:14px;margin-right:30px;margin-top:40px}'
    );
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    const getIndexCalls = trackIndexCalls(rule);

    reduceBoxRuns(rule, 'margin');

    // Neither candidate selection nor the deferred edits scan the rule.
    assert.strictEqual(getIndexCalls(), 0);
    assert.strictEqual(
      root.toString(),
      'a{color:red;font-size:14px;margin:40px 30px 20px 10px}'
    );
  });

  test('reduceBorderRadius avoids rule.index scans when selecting the latest candidate', async () => {
    const { reduceBorderRadiusRuns } = await import('./helpers/reduceRuns.js');
    const root = postcss.parse(
      'a{border-bottom-left-radius:40px;color:red;border-bottom-right-radius:30px;border-top-right-radius:20px;border-top-left-radius:10px}'
    );
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    const getIndexCalls = trackIndexCalls(rule);

    reduceBorderRadiusRuns(rule);

    // Neither candidate selection nor the deferred edits scan the rule.
    assert.strictEqual(getIndexCalls(), 0);
    assert.strictEqual(
      root.toString(),
      'a{color:red;border-radius:10px 20px 30px 40px}'
    );
  });

  test('reduceBox avoids rule.index scans when fallback candidates are present', async () => {
    const { reduceBoxRuns } = await import('./helpers/reduceRuns.js');
    const root = postcss.parse(
      'a{margin-left:10px;margin-left:calc(10px + 1em);margin-bottom:20px;color:red;margin-right:30px;margin-top:40px}'
    );
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    const getIndexCalls = trackIndexCalls(rule);

    reduceBoxRuns(rule, 'margin');

    // Neither candidate selection nor the deferred edits scan the rule. The
    // calc() fallback stays unmerged: the default targets lack calc().
    assert.strictEqual(getIndexCalls(), 0);
    assert.strictEqual(
      root.toString(),
      'a{margin-left:10px;margin-left:calc(10px + 1em);margin-bottom:20px;color:red;margin-right:30px;margin-top:40px}'
    );
  });

  test('reduceBorderRadius avoids rule.index scans when fallback candidates are present', async () => {
    const { reduceBorderRadiusRuns } = await import('./helpers/reduceRuns.js');
    const root = postcss.parse(
      'a{border-top-left-radius:10px;border-top-left-radius:calc(10px + 1em);border-top-right-radius:20px;border-bottom-right-radius:30px;color:red;border-bottom-left-radius:40px}'
    );
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    const getIndexCalls = trackIndexCalls(rule);

    reduceBorderRadiusRuns(rule);

    // Neither candidate selection nor the deferred edits scan the rule. The
    // calc() fallback stays unmerged: the default targets lack calc().
    assert.strictEqual(getIndexCalls(), 0);
    assert.strictEqual(
      root.toString(),
      'a{border-top-left-radius:10px;border-top-left-radius:calc(10px + 1em);border-top-right-radius:20px;border-bottom-right-radius:30px;color:red;border-bottom-left-radius:40px}'
    );
  });
});
