import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bootstrapConfidenceInterval,
  clusteredTwoSampleBootstrapConfidenceInterval,
  fitCrossoverModel,
  mean,
  median,
  normalQuantile,
  pairedPercentChange,
  quantile,
  randomFor,
  seedNumber,
  standardDeviation,
  studentTQuantile,
  summaryStatistics,
  twoSampleBootstrapConfidenceInterval,
} from './bench-stats.js';

test('mean, median, and standardDeviation calculate standard sample statistics', () => {
  const values = [2, 4, 4, 4, 5, 5, 7, 9];
  assert.equal(mean(values), 5);
  assert.equal(median(values), 4.5);
  // Sample variance = 32 / 7 ≈ 4.57142857, sd = Math.sqrt(32 / 7) ≈ 2.1380899
  assert.ok(Math.abs(standardDeviation(values) - Math.sqrt(32 / 7)) < 1e-10);
  assert.equal(standardDeviation([5]), 0);
  assert.equal(standardDeviation([]), 0);
});

test('deterministic random generator is reproducible from a seed', () => {
  const gen1 = randomFor('test-seed');
  const gen2 = randomFor('test-seed');
  const numbers1 = Array.from({ length: 5 }, () => gen1());
  const numbers2 = Array.from({ length: 5 }, () => gen2());
  assert.deepEqual(numbers1, numbers2);
  assert.equal(seedNumber('test'), seedNumber('test'));
  assert.notEqual(seedNumber('test'), seedNumber('other'));
});

test('normalQuantile matches standard normal percentiles', () => {
  assert.ok(Math.abs(normalQuantile(0.5)) < 1e-6);
  assert.ok(Math.abs(normalQuantile(0.975) - 1.959964) < 1e-4);
  assert.ok(Math.abs(normalQuantile(0.95) - 1.644854) < 1e-4);
  assert.ok(Math.abs(normalQuantile(0.025) - -1.959964) < 1e-4);
  assert.throws(() => normalQuantile(0), RangeError);
  assert.throws(() => normalQuantile(1), RangeError);
});

test('studentTQuantile matches exact Student t critical values', () => {
  // df = 3, p = 0.975 -> t ≈ 3.1824
  assert.ok(Math.abs(studentTQuantile(0.975, 3) - 3.1824) < 0.005);
  // df = 8, p = 0.975 -> t ≈ 2.3060
  assert.ok(Math.abs(studentTQuantile(0.975, 8) - 2.306) < 0.001);
  // df = 18, p = 0.975 -> t ≈ 2.1009
  assert.ok(Math.abs(studentTQuantile(0.975, 18) - 2.1009) < 0.0001);
  // df = 78, p = 0.975 -> t ≈ 1.9908
  assert.ok(Math.abs(studentTQuantile(0.975, 78) - 1.9908) < 0.0001);
  // df = 18, p = 0.95 -> t ≈ 1.7341
  assert.ok(Math.abs(studentTQuantile(0.95, 18) - 1.7341) < 0.0001);
  // Symmetry
  assert.ok(
    Math.abs(studentTQuantile(0.025, 18) - -studentTQuantile(0.975, 18)) < 1e-10
  );
  assert.equal(studentTQuantile(0.5, 18), 0);
  assert.throws(() => studentTQuantile(0, 10), RangeError);
  assert.throws(() => studentTQuantile(1, 10), RangeError);
  assert.throws(() => studentTQuantile(0.95, 0), RangeError);
});

test('fitCrossoverModel computes 2x2 crossover treatment and order effects accurately', () => {
  // 10 blocks: 5 baselineFirst, 5 candidateFirst
  // baselineFirst: y_b = mu + pi + eps
  // candidateFirst: y_b = mu - pi + eps
  // Let mu = 0.02, gamma = 0.04, pi = 0.5 * gamma = 0.02
  // (so baselineFirst mean = 0.04, candidateFirst mean = 0.00)
  const b1 = [0.039, 0.041, 0.04, 0.038, 0.042];
  const b2 = [-0.001, 0.001, 0.0, -0.002, 0.002];
  const result = fitCrossoverModel({
    baselineFirstLogs: b1,
    candidateFirstLogs: b2,
    superiorityConfidenceLevel: 0.95,
    equivalenceConfidenceLevel: 0.9,
    orderInteractionThreshold: 0.05,
  });
  assert.ok(Math.abs(result.treatmentEffect - 0.02) < 1e-6);
  assert.ok(Math.abs(result.orderEffect - 0.02) < 1e-6);
  assert.ok(Math.abs(result.orderDifference - 0.04) < 1e-6);
  assert.equal(result.degreesOfFreedom, 8);
  assert.ok(result.residualStandardDeviation > 0);
  assert.ok(result.confidenceInterval.low < Math.exp(0.02));
  assert.ok(result.confidenceInterval.high > Math.exp(0.02));
  // Order effect 0.02 is well within ln(1.05) ≈ 0.04879
  assert.ok('orderIsStable' in result);
  assert.equal(result.orderIsStable, true);
  assert.ok('orderConfidenceInterval' in result);
});

test('fitCrossoverModel rejects large order interaction', () => {
  // Clear order effect of 0.15, well beyond threshold of ln(1.05) ≈ 0.0488
  const b1 = [0.15, 0.15, 0.15, 0.15, 0.15];
  const b2 = [0.0, 0.0, 0.0, 0.0, 0.0];
  const result = fitCrossoverModel({
    baselineFirstLogs: b1,
    candidateFirstLogs: b2,
    orderInteractionThreshold: 0.05,
  });
  assert.equal(result.orderIsStable, false);
});

test('summary statistics and quantiles are deterministic', () => {
  assert.deepEqual(summaryStatistics([4, 1, 3, 2]), {
    n: 4,
    minMs: 1,
    medianMs: 2.5,
    meanMs: 2.5,
    p95Ms: 3.8499999999999996,
    maxMs: 4,
  });
});

test('summary statistics and quantiles reject nonsensical values (negative, NaN, out-of-bounds q)', () => {
  assert.throws(() => quantile([1, 2, 3], -0.1), /between 0 and 1/v);
  assert.throws(() => quantile([1, 2, 3], 1.1), /between 0 and 1/v);
  assert.throws(() => quantile([1, 2, 3], Number.NaN), /between 0 and 1/v);
  assert.throws(
    () => quantile([], 0.5),
    /cannot calculate a quantile of no samples/v
  );
  assert.throws(
    () => quantile([1, Number.NaN, 3], 0.5),
    /must be finite numbers/v
  );
  assert.throws(() => summaryStatistics([]), /cannot be empty/v);
  assert.throws(
    () => summaryStatistics([-1, 2, 3]),
    /must be non-negative finite numbers/v
  );
  assert.throws(
    () => summaryStatistics([1, Number.NaN, 3]),
    /must be non-negative finite numbers/v
  );
  assert.throws(
    () => summaryStatistics([1, Infinity, 3]),
    /must be non-negative finite numbers/v
  );
});

test('paired percent change rejects negative and non-finite timings', () => {
  assert.throws(
    () => pairedPercentChange(-1, 2),
    /must be non-negative finite numbers/v
  );
  assert.throws(
    () => pairedPercentChange(2, -1),
    /must be non-negative finite numbers/v
  );
  assert.throws(
    () => pairedPercentChange(Number.NaN, 2),
    /must be non-negative finite numbers/v
  );
  assert.throws(
    () => pairedPercentChange(2, Infinity),
    /must be non-negative finite numbers/v
  );
  assert.equal(pairedPercentChange(0, 0), 0);
  assert.equal(pairedPercentChange(0, 5), Infinity);
  assert.equal(pairedPercentChange(100, 90), -10);
});

test('bootstrap intervals are deterministic', () => {
  const first = bootstrapConfidenceInterval([-12, -10, -8], 1000);
  assert.deepEqual(bootstrapConfidenceInterval([-12, -10, -8], 1000), first);
  assert.ok(first.low <= -10 && first.high >= -10);
});

test('confidence intervals reject non-finite values and non-positive resamples', () => {
  assert.throws(() => bootstrapConfidenceInterval([]), /cannot be empty/v);
  assert.throws(
    () => bootstrapConfidenceInterval([1, Number.NaN, 3]),
    /must be finite numbers/v
  );
  assert.throws(
    () => bootstrapConfidenceInterval([1, 2, 3], 0),
    /must be a positive integer/v
  );
  assert.throws(
    () => bootstrapConfidenceInterval([1, 2, 3], -5),
    /must be a positive integer/v
  );
});

test('two-sample bootstrap intervals are deterministic and reject invalid inputs', () => {
  const first = twoSampleBootstrapConfidenceInterval(
    [100, 102, 98, 101, 99],
    [90, 92, 88, 91, 89],
    1000
  );
  assert.deepEqual(
    twoSampleBootstrapConfidenceInterval(
      [100, 102, 98, 101, 99],
      [90, 92, 88, 91, 89],
      1000
    ),
    first
  );
  assert.ok(first.high < 0);
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([], [1, 2, 3]),
    /cannot be empty/v
  );
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([1, 2, 3], []),
    /cannot be empty/v
  );
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([-1, 2, 3], [1, 2, 3]),
    /non-negative finite numbers/v
  );
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([1, 2, 3], [1, Number.NaN, 3]),
    /non-negative finite numbers/v
  );
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([1, 2, 3], [1, 2, 3], 0),
    /must be a positive integer/v
  );
  const sampleGroupsA = [
    [100, 101, 99],
    [102, 100, 101],
    [99, 100, 98],
  ];
  const sampleGroupsB = [
    [90, 91, 89],
    [92, 90, 91],
    [89, 90, 88],
  ];
  const clustered = clusteredTwoSampleBootstrapConfidenceInterval(
    sampleGroupsA,
    sampleGroupsB,
    1000
  );
  assert.deepEqual(
    clusteredTwoSampleBootstrapConfidenceInterval(
      sampleGroupsA,
      sampleGroupsB,
      1000
    ),
    clustered
  );
  assert.throws(
    () => clusteredTwoSampleBootstrapConfidenceInterval([[]], [[1, 2, 3]]),
    /sample groups cannot be empty/v
  );
});
