export function quantile(sorted, q) {
  if (!sorted.length)
    throw new RangeError('cannot calculate a quantile of no samples');
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function summaryStatistics(samples) {
  if (!samples.length)
    throw new RangeError('benchmark samples cannot be empty');
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
