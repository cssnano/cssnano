export const BOOTSTRAP_RESAMPLES = 10_000;

function quantile(values, q) {
  const sorted = [...values].toSorted((a, b) => a - b);
  if (!sorted.length)
    throw new RangeError('cannot calculate a quantile of no samples');
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export { quantile };

export function pairedPercentChange(base, candidate) {
  if (base === 0) return candidate === 0 ? 0 : Infinity;
  return ((candidate - base) / base) * 100;
}

function deterministicRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

export function bootstrapConfidenceInterval(
  values,
  resamples = BOOTSTRAP_RESAMPLES
) {
  if (!values.length) throw new RangeError('bootstrap values cannot be empty');
  if (!Number.isInteger(resamples) || resamples < 1) {
    throw new RangeError('bootstrap resamples must be a positive integer');
  }
  const random = deterministicRandom(1729);
  const medians = [];
  for (let sample = 0; sample < resamples; sample++) {
    const resampled = [];
    for (let index = 0; index < values.length; index++) {
      resampled.push(values[Math.floor(random() * values.length)]);
    }
    medians.push(quantile(resampled, 0.5));
  }
  return {
    low: quantile(medians, 0.025),
    high: quantile(medians, 0.975),
  };
}
