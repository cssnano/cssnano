import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertScaling,
  checkDoublingRatios,
  computeMedian,
} from './helpers/scalingHelper.js';

test('computeMedian calculates correct median for odd and even sample sizes', () => {
  assert.equal(computeMedian([10, 30, 20]), 20);
  assert.equal(computeMedian([10, 40, 20, 30]), 25);
  assert.equal(computeMedian([42]), 42);
  assert.equal(computeMedian([]), 0);
});

test('computeMedian resists single large outlier compared to mean or minimum', () => {
  const cleanSamples = [100, 101, 102, 103, 104];
  const outlierSamples = [100, 101, 102, 103, 9999]; // e.g. GC pause
  assert.equal(computeMedian(cleanSamples), 102);
  assert.equal(computeMedian(outlierSamples), 102);
});

test('checkDoublingRatios evaluates ratios across sizes and identifies failure', () => {
  const passing = checkDoublingRatios([100, 200, 400], 3.0);
  assert.equal(passing.pass, true);
  assert.deepEqual(
    passing.ratios.map((r) => Number(r.toFixed(1))),
    [2.0, 2.0]
  );

  const failing = checkDoublingRatios([100, 200, 700], 3.0);
  assert.equal(failing.pass, false);
  assert.equal(failing.failedIndex, 2);
  assert.equal(failing.failedRatio, 3.5);
  assert.equal(failing.ratios.length, 2);
});

test('assertScaling passes for sub-limit workloads and validates outputs', () => {
  let validated = false;
  const result = assertScaling(
    [100, 200, 400],
    (size) => ({
      input: `.a-${size}`,
      expected: `.a-${size}`,
      validate(out) {
        if (out === '.a-400') validated = true;
      },
    }),
    {
      doublingLimit: 3.5,
      samples: 3,
      execute(item) {
        return item.input;
      },
    }
  );

  assert.equal(validated, true);
  assert.ok(result.medians.length === 3);
  assert.ok(result.sampleCount === 3);
});

test('assertScaling pools retry samples when initial batch encounters transient spike', () => {
  let delayRuns = 2;
  const result = assertScaling(
    [10, 20],
    (size) => ({
      input: `item-${size}`,
    }),
    {
      doublingLimit: 2.2,
      samples: 3,
      iterations: 1,
      execute(item) {
        // Inject delay on first 2 samples of item-20 so the initial 3-sample median fails
        if (item.input === 'item-20' && delayRuns > 0) {
          delayRuns--;
          const spinTarget = Date.now() + 5;
          while (Date.now() < spinTarget) {
            // spin
          }
        }
        return item.input;
      },
    }
  );

  // Since initial ratio spiked, a retry was collected and pooled to 6 samples total, where clean samples dominate
  assert.equal(result.sampleCount, 6);
});

test('assertScaling fails with detailed per-size diagnostics when scaling limit is exceeded', () => {
  assert.throws(
    () => {
      assertScaling(
        [10, 20, 40],
        (size) => ({
          input: `item-${size}`,
        }),
        {
          doublingLimit: 2.0,
          samples: 3,
          label: 'quadratic-test',
          execute(item) {
            // Artificially create super-linear timing
            const count = item.input.endsWith('40') ? 20_000 : 100;
            let sum = 0;
            for (let i = 0; i < count; i++) {
              sum += i;
            }
            return `${item.input}-${sum}`;
          },
        }
      );
    },
    (err) => {
      assert.ok(err instanceof assert.AssertionError);
      assert.match(err.message, /quadratic-test doubling ratio/v);
      assert.match(err.message, /Per-size timings/v);
      assert.match(err.message, /size 10:/v);
      assert.match(err.message, /size 20:/v);
      assert.match(err.message, /size 40:/v);
      assert.match(err.message, /pooled across 2 batches/v);
      return true;
    }
  );
});
