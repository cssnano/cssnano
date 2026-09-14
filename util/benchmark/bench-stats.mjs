export const BOOTSTRAP_RESAMPLES = 10_000;

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

// Preserve the old helper name for consumers of the benchmark utilities.
export const pairedPercentChange = percentChange;

function deterministicRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

function selectValue(values, index) {
  let left = 0;
  let right = values.length - 1;
  while (left <= right) {
    const pivot = values[Math.floor((left + right) / 2)];
    let lower = left;
    let upper = right;
    while (lower <= upper) {
      while (values[lower] < pivot) lower++;
      while (values[upper] > pivot) upper--;
      if (lower <= upper) {
        [values[lower], values[upper]] = [values[upper], values[lower]];
        lower++;
        upper--;
      }
    }
    if (index <= upper) right = upper;
    else if (index >= lower) left = lower;
    else return values[index];
  }
  return values[index];
}

function resampledMedian(values, random) {
  const resampled = Array.from(
    { length: values.length },
    () => values[Math.floor(random() * values.length)]
  );
  const upper = Math.floor(values.length / 2);
  if (values.length % 2) return selectValue(resampled, upper);
  const lower = selectValue(resampled, upper - 1);
  return (lower + selectValue(resampled, upper)) / 2;
}

function validateSampleGroups(groups) {
  if (!groups.length || groups.some((group) => !group.length)) {
    throw new RangeError('bootstrap sample groups cannot be empty');
  }
  for (const group of groups) {
    for (const value of group) {
      if (!Number.isFinite(value) || value < 0) {
        throw new RangeError(
          'bootstrap sample groups must contain non-negative finite numbers'
        );
      }
    }
  }
}

function resampledGroupedMedian(groups, random) {
  const values = [];
  for (let index = 0; index < groups.length; index++) {
    const group = groups[Math.floor(random() * groups.length)];
    for (let sample = 0; sample < group.length; sample++) {
      values.push(group[Math.floor(random() * group.length)]);
    }
  }
  return resampledMedian(values, random);
}

export function bootstrapConfidenceInterval(
  values,
  resamples = BOOTSTRAP_RESAMPLES
) {
  if (!values.length) throw new RangeError('bootstrap values cannot be empty');
  for (const value of values) {
    if (!Number.isFinite(value)) {
      throw new TypeError('bootstrap values must be finite numbers');
    }
  }
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
    medians.push(
      quantile(
        resampled.toSorted((a, b) => a - b),
        0.5
      )
    );
  }
  const sorted = medians.toSorted((a, b) => a - b);
  return {
    low: quantile(sorted, 0.025),
    high: quantile(sorted, 0.975),
  };
}

export function twoSampleBootstrapConfidenceInterval(
  baseValues,
  candidateValues,
  resamples = BOOTSTRAP_RESAMPLES
) {
  if (!baseValues.length || !candidateValues.length) {
    throw new RangeError('bootstrap samples cannot be empty');
  }
  for (const value of [...baseValues, ...candidateValues]) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(
        'bootstrap samples must be non-negative finite numbers'
      );
    }
  }
  if (!Number.isInteger(resamples) || resamples < 1) {
    throw new RangeError('bootstrap resamples must be a positive integer');
  }

  const random = deterministicRandom(1729);
  const changes = [];
  for (let sample = 0; sample < resamples; sample++) {
    const baseMedian = resampledMedian(baseValues, random);
    const candidateMedian = resampledMedian(candidateValues, random);
    const change = percentChange(baseMedian, candidateMedian);
    if (!Number.isFinite(change)) {
      throw new RangeError(
        'bootstrap samples must have a positive baseline median'
      );
    }
    changes.push(change);
  }
  const sorted = changes.toSorted((a, b) => a - b);
  return {
    low: quantile(sorted, 0.025),
    high: quantile(sorted, 0.975),
  };
}

export function clusteredTwoSampleBootstrapConfidenceInterval(
  baseGroups,
  candidateGroups,
  resamples = BOOTSTRAP_RESAMPLES
) {
  // Resample process runs and their measured iterations separately so repeated
  // timings do not masquerade as independent process replicates.
  validateSampleGroups(baseGroups);
  validateSampleGroups(candidateGroups);
  if (!Number.isInteger(resamples) || resamples < 1) {
    throw new RangeError('bootstrap resamples must be a positive integer');
  }

  const random = deterministicRandom(1729);
  const changes = [];
  for (let sample = 0; sample < resamples; sample++) {
    const baseMedian = resampledGroupedMedian(baseGroups, random);
    const candidateMedian = resampledGroupedMedian(candidateGroups, random);
    const change = percentChange(baseMedian, candidateMedian);
    if (!Number.isFinite(change)) {
      throw new RangeError(
        'bootstrap samples must have a positive baseline median'
      );
    }
    changes.push(change);
  }
  const sorted = changes.toSorted((a, b) => a - b);
  return {
    low: quantile(sorted, 0.025),
    high: quantile(sorted, 0.975),
  };
}
