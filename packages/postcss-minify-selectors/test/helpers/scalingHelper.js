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
 * @property {number} [iterations] - Optional explicit iteration count per sample block.
 * @property {string} [label] - Optional label for reporting in assertion messages.
 * @property {(item: ScalingCase) => string} [execute] - Optional custom execution callback.
 */

/**
 * Computes the median duration across an array of timed sample durations.
 *
 * @param {readonly number[]} durations
 * @returns {number}
 */
export function computeMedian(durations) {
  if (durations.length === 0) return 0;
  const sorted = durations.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Warms up V8 JIT compilation across all inputs, then calibrates iteration count
 * on the warmed baseline so timed slices exceed timer resolution and scheduler jitter.
 *
 * @param {({ size: number } & ScalingCase)[]} prepared
 * @param {(item: ScalingCase) => string} execute
 * @returns {number}
 */
function warmupAndCalibrate(prepared, execute) {
  if (prepared.length === 0) return 1;

  // Warm up across all sizes so V8 optimizes loops and stabilizes inline caches.
  for (let round = 0; round < 6; round++) {
    for (let i = 0; i < prepared.length; i++) {
      execute(prepared[i]);
    }
  }

  // Measure steady-state duration on the warmed smallest input over repeated runs.
  const first = prepared[0];
  const calSamples = 5;
  const calDurations = [];
  for (let i = 0; i < calSamples; i++) {
    const calStart = process.hrtime.bigint();
    execute(first);
    calDurations.push(Number(process.hrtime.bigint() - calStart));
  }
  const calDuration = computeMedian(calDurations);

  // Target at least 10ms per sample block to insulate against OS scheduling quanta.
  const targetNs = 10_000_000;
  return Math.max(
    1,
    Math.min(1000, Math.ceil(targetNs / Math.max(1, calDuration)))
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
 * Evaluates doubling ratios between successive sizes.
 *
 * @param {readonly number[]} times
 * @param {number} doublingLimit
 * @returns {{ pass: boolean, ratios: number[], failedIndex?: number, failedRatio?: number }}
 */
export function checkDoublingRatios(times, doublingLimit) {
  const ratios = [];
  let firstFailedIndex;
  let firstFailedRatio;

  for (let i = 1; i < times.length; i++) {
    const prev = times[i - 1];
    const ratio = prev > 0 ? times[i] / prev : 1;
    ratios.push(ratio);
    if (ratio >= doublingLimit && firstFailedIndex === undefined) {
      firstFailedIndex = i;
      firstFailedRatio = ratio;
    }
  }

  if (firstFailedIndex !== undefined) {
    return {
      pass: false,
      ratios,
      failedIndex: firstFailedIndex,
      failedRatio: firstFailedRatio,
    };
  }

  return { pass: true, ratios };
}

/**
 * Measures samples across sizes and appends durations to existing sample pools.
 *
 * Alternates iteration order across successive sample rounds to distribute
 * memory allocation and GC effects evenly across all sizes.
 *
 * @param {({ size: number } & ScalingCase)[]} prepared
 * @param {number} iterations
 * @param {number} samples
 * @param {(item: ScalingCase) => string} execute
 * @param {number[][]} [existingDurations]
 * @returns {{ allDurations: number[][], outputs: string[] }}
 */
function collectSamples(
  prepared,
  iterations,
  samples,
  execute,
  existingDurations
) {
  /** @type {number[][]} */
  const allDurations = existingDurations ?? prepared.map(() => []);
  /** @type {string[]} */
  const outputs = prepared.map(() => '');

  for (let sampleIndex = 0; sampleIndex < samples; sampleIndex++) {
    const isReverse = sampleIndex % 2 === 1;
    for (let step = 0; step < prepared.length; step++) {
      const i = isReverse ? prepared.length - 1 - step : step;
      const item = prepared[i];

      let output = '';
      const start = process.hrtime.bigint();
      for (let iter = 0; iter < iterations; iter++) {
        output = execute(item);
      }
      const duration = Number(process.hrtime.bigint() - start);

      if (duration <= 0) {
        throw new Error(
          `Measured zero or non-positive duration (${duration} ns) for size ${item.size}`
        );
      }

      allDurations[i].push(duration);
      outputs[i] = output;
    }
  }

  return { allDurations, outputs };
}

/**
 * Formats duration in nanoseconds to a human-readable string.
 *
 * @param {number} ns
 * @returns {string}
 */
function formatDuration(ns) {
  if (ns >= 1_000_000) {
    return `${(ns / 1_000_000).toFixed(2)} ms`;
  }
  if (ns >= 1_000) {
    return `${(ns / 1_000).toFixed(2)} µs`;
  }
  return `${ns.toFixed(0)} ns`;
}

/**
 * Formats detailed diagnostic failure message for scaling regressions.
 *
 * @param {object} params
 * @param {string} params.label
 * @param {readonly number[]} params.sizes
 * @param {readonly number[]} params.medians
 * @param {readonly number[]} params.ratios
 * @param {number} params.sampleCount
 * @param {number} params.failedIndex
 * @param {number} params.failedRatio
 * @param {number} params.doublingLimit
 * @param {boolean} params.retried
 * @returns {string}
 */
function formatDiagnosticReport({
  label,
  sizes,
  medians,
  ratios,
  sampleCount,
  failedIndex,
  failedRatio,
  doublingLimit,
  retried,
}) {
  const prefix = label ? `${label} ` : '';
  const lines = [
    `${prefix}doubling ratio at index ${failedIndex} (size ${sizes[failedIndex]} vs ${sizes[failedIndex - 1]}): ${failedRatio.toFixed(2)} (expected < ${doublingLimit})`,
    `Per-size timings (median of ${sampleCount} samples${retried ? ' pooled across 2 batches' : ''}):`,
  ];

  for (let i = 0; i < sizes.length; i++) {
    const sizeStr = `  size ${sizes[i]}: ${formatDuration(medians[i])}`;
    if (i === 0) {
      lines.push(sizeStr);
    } else {
      const ratio = ratios[i - 1];
      const flag = ratio >= doublingLimit ? ' [EXCEEDED LIMIT]' : '';
      lines.push(`${sizeStr} (ratio: ${ratio.toFixed(2)}x)${flag}`);
    }
  }

  return lines.join('\n');
}

/**
 * Measures asymptotic scaling across increasing input sizes with isolated timing.
 *
 * @param {readonly number[]} sizes
 * @param {(size: number) => ScalingCase} generateCase
 * @param {ScalingOptions} [options]
 * @returns {{ medians: number[], ratios: number[], sampleCount: number }}
 */
export function assertScaling(sizes, generateCase, options = {}) {
  const {
    doublingLimit = 3.5,
    samples = 5,
    label = '',
    execute,
    iterations: customIterations,
  } = options;

  const run =
    execute ??
    ((item) =>
      normalizeList(item.input, item.sort ?? false, item.convertToIs ?? false));

  // 1. Build all inputs and expected outputs before timing.
  const prepared = sizes.map((size) => ({
    size,
    ...generateCase(size),
  }));

  // 2. Warm up across all sizes and calibrate iterations on smallest size.
  const iterations = customIterations ?? warmupAndCalibrate(prepared, run);

  // 3. Collect timed samples.
  let { allDurations, outputs } = collectSamples(
    prepared,
    iterations,
    samples,
    run
  );

  // 4. Validate output after timing.
  validateOutputs(prepared, outputs);

  // 5. Evaluate doubling ratios using median duration to resist outliers.
  let medians = allDurations.map((durations) => computeMedian(durations));
  let check = checkDoublingRatios(medians, doublingLimit);

  if (!check.pass) {
    const retry = collectSamples(
      prepared,
      iterations,
      samples,
      run,
      allDurations
    );
    allDurations = retry.allDurations;
    medians = allDurations.map((durations) => computeMedian(durations));
    check = checkDoublingRatios(medians, doublingLimit);

    if (!check.pass) {
      assert.ok(
        false,
        formatDiagnosticReport({
          label,
          sizes,
          medians,
          ratios: check.ratios,
          sampleCount: allDurations[0]?.length ?? 0,
          failedIndex: check.failedIndex ?? 1,
          failedRatio: check.failedRatio ?? 0,
          doublingLimit,
          retried: true,
        })
      );
    }
  }

  return {
    medians,
    ratios: check.ratios,
    sampleCount: allDurations[0]?.length ?? 0,
  };
}
