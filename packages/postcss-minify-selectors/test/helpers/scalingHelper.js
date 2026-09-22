import assert from 'node:assert/strict';
import { normalizeList } from '../../src/lib/selectorScanner.js';

/**
 * @typedef {object} ScalingCase
 * @property {string} input
 * @property {string} [expected]
 * @property {(output: string) => void} [validate]
 * @property {boolean} [sort=false]
 * @property {boolean} [convertToIs=false]
 */

/**
 * @typedef {object} ScalingOptions
 * @property {number} [doublingLimit=3.5] - Upper limit for the doubling ratio.
 * @property {number} [samples=5] - Number of timed samples to collect per size.
 * @property {string} [label] - Optional label for reporting in assertion messages.
 */

/**
 * @param {({ size: number } & ScalingCase)[]} prepared
 * @returns {number}
 */
function warmupAndCalibrate(prepared) {
  if (prepared.length === 0) return 1;
  const first = prepared[0];
  const firstSort = first.sort ?? false;
  const firstConvertToIs = first.convertToIs ?? false;
  normalizeList(first.input, firstSort, firstConvertToIs);
  const calStart = process.hrtime.bigint();
  normalizeList(first.input, firstSort, firstConvertToIs);
  const calDuration = Number(process.hrtime.bigint() - calStart);

  for (let i = 1; i < prepared.length; i++) {
    const item = prepared[i];
    normalizeList(item.input, item.sort ?? false, item.convertToIs ?? false);
  }

  // Ensure small workloads run enough iterations to exceed timer resolution and scheduler jitter.
  const targetNs = 5_000_000;
  return Math.max(
    1,
    Math.min(50, Math.ceil(targetNs / Math.max(1, calDuration)))
  );
}

/**
 * @param {({ size: number } & ScalingCase)[]} prepared
 * @param {string[]} outputs
 */
function validateOutputs(prepared, outputs) {
  for (let i = 0; i < prepared.length; i++) {
    const item = prepared[i];
    const output = outputs[i];
    if (item.expected !== undefined) {
      assert.equal(output, item.expected);
    }
    if (typeof item.validate === 'function') {
      item.validate(output);
    }
  }
}

/**
 * @param {number[]} medianTimes
 * @param {number} doublingLimit
 * @param {string} label
 */
function assertDoublingRatios(medianTimes, doublingLimit, label) {
  for (let i = 1; i < medianTimes.length; i++) {
    const ratio = medianTimes[i] / medianTimes[i - 1];
    const prefix = label
      ? `${label} doubling ratio ${i}`
      : `doubling ratio ${i}`;
    assert.ok(
      ratio < doublingLimit,
      `${prefix}: ${ratio.toFixed(2)} (expected < ${doublingLimit})`
    );
  }
}

/**
 * Measures asymptotic scaling across increasing input sizes with isolated timing.
 *
 * @param {readonly number[]} sizes
 * @param {(size: number) => ScalingCase} generateCase
 * @param {ScalingOptions} [options]
 */
export function assertScaling(sizes, generateCase, options = {}) {
  const { doublingLimit = 3.5, samples = 5, label = '' } = options;

  // 1. Build all inputs and expected outputs before timing.
  const prepared = sizes.map((size) => ({
    size,
    ...generateCase(size),
  }));

  // Warmup across all sizes and calibrate iterations on smallest size.
  const iterations = warmupAndCalibrate(prepared);

  // 2. Collect timed samples interleaved across sizes to distribute GC and system noise evenly.
  /** @type {number[][]} */
  const allDurations = sizes.map(() => []);
  /** @type {string[]} */
  const outputs = sizes.map(() => '');

  for (let sampleIndex = 0; sampleIndex < samples; sampleIndex++) {
    for (let i = 0; i < prepared.length; i++) {
      const item = prepared[i];
      const sort = item.sort ?? false;
      const convertToIs = item.convertToIs ?? false;

      let output = '';
      const start = process.hrtime.bigint();
      for (let iter = 0; iter < iterations; iter++) {
        output = normalizeList(item.input, sort, convertToIs);
      }
      const duration = Number(process.hrtime.bigint() - start);

      if (duration <= 0) {
        throw new Error(
          `Measured zero or non-positive duration (${duration} ns) for size ${item.size} (sample ${sampleIndex + 1})`
        );
      }

      allDurations[i].push(duration);
      outputs[i] = output;
    }
  }

  const medianTimes = allDurations.map((durations) => {
    durations.sort((a, b) => a - b);
    return durations[Math.floor(durations.length / 2)];
  });

  // 3. Validate output after timing.
  validateOutputs(prepared, outputs);

  // 4. Assert doubling ratio between successive sizes.
  assertDoublingRatios(medianTimes, doublingLimit, label);
}
