export function quantile(sorted, q) {
  if (!sorted.length)
    throw new RangeError('cannot calculate a quantile of no samples');
  if (!Number.isFinite(q) || q < 0 || q > 1) {
    throw new RangeError(
      `quantile q must be a number between 0 and 1; received ${q}`
    );
  }
  for (const sample of sorted) {
    if (!Number.isFinite(sample)) {
      throw new TypeError('quantile samples must be finite numbers');
    }
  }
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function summaryStatistics(samples) {
  if (!samples.length)
    throw new RangeError('benchmark samples cannot be empty');
  for (const sample of samples) {
    if (!Number.isFinite(sample) || sample < 0) {
      throw new RangeError(
        'benchmark samples must be non-negative finite numbers'
      );
    }
  }
  const sorted = [...samples].toSorted((a, b) => a - b);
  const sum = sorted.reduce((total, sample) => total + sample, 0);
  return {
    n: sorted.length,
    minMs: sorted[0],
    medianMs: quantile(sorted, 0.5),
    meanMs: sum / sorted.length,
    p95Ms: quantile(sorted, 0.95),
    maxMs: sorted[sorted.length - 1],
  };
}

export function fmtMs(ms) {
  return ms.toFixed(2).padStart(8) + ' ms';
}

export function percentChange(base, candidate) {
  if (
    !Number.isFinite(base) ||
    !Number.isFinite(candidate) ||
    base < 0 ||
    candidate < 0
  ) {
    throw new RangeError(
      'benchmark timings must be non-negative finite numbers'
    );
  }
  if (base === 0) return candidate === 0 ? 0 : Infinity;
  return ((candidate - base) / base) * 100;
}

export function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values) {
  return quantile(
    [...values].toSorted((a, b) => a - b),
    0.5
  );
}

export function standardDeviation(values) {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

export function seedNumber(seed) {
  let state = 2166136261;
  for (const character of String(seed))
    state = (state + character.codePointAt(0) * 16777619) % 4294967296;
  return state || 1;
}

export function randomFor(seed) {
  let state = seedNumber(seed);
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
