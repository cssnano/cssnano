import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fitCrossoverModel,
  mean,
  median,
  normalQuantile,
  randomFor,
  seedNumber,
  standardDeviation,
  studentTQuantile,
} from './bench-stats.mjs';

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
  // baselineFirst: y_b = mu + 0.5 * gamma + eps
  // candidateFirst: y_b = mu - 0.5 * gamma + eps
  // Let mu = 0.02, gamma = 0.04 (so baselineFirst mean = 0.04, candidateFirst mean = 0.00)
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
  assert.ok(Math.abs(result.orderEffect - 0.04) < 1e-6);
  assert.equal(result.degreesOfFreedom, 8);
  assert.ok(result.residualStandardDeviation > 0);
  assert.ok(result.confidenceInterval.low < Math.exp(0.02));
  assert.ok(result.confidenceInterval.high > Math.exp(0.02));
  // Order effect 0.04 is within ln(1.05) ≈ 0.04879, but CI might span beyond or be contained
  assert.ok('orderIsStable' in result);
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
