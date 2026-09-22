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

/**
 * @deprecated Legacy bootstrap confidence interval. Unused by the modern v3
 * crossover Student's t pipeline; retained for independent snapshot comparisons.
 */
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

/**
 * @deprecated Legacy two-sample bootstrap interval. Retained for independent
 * snapshot comparisons.
 */
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

/**
 * @deprecated Legacy clustered bootstrap interval. Retained for independent
 * snapshot comparisons.
 */
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

export function normalQuantile(probability) {
  if (probability <= 0 || probability >= 1) {
    throw new RangeError('probability must be in (0, 1)');
  }
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q;
  let r;

  if (probability < pLow) {
    q = Math.sqrt(-2 * Math.log(probability));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  if (probability <= pHigh) {
    q = probability - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }

  q = Math.sqrt(-2 * Math.log(1 - probability));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

export function studentTQuantile(probability, degreesOfFreedom) {
  if (probability <= 0 || probability >= 1) {
    throw new RangeError('probability must be in (0, 1)');
  }
  if (!Number.isInteger(degreesOfFreedom) || degreesOfFreedom < 1) {
    throw new RangeError('degreesOfFreedom must be a positive integer');
  }

  const z = normalQuantile(probability);
  const v = degreesOfFreedom;

  const v2 = v * v;
  const v3 = v2 * v;
  const v4 = v3 * v;

  const z3 = z * z * z;
  const z5 = z3 * z * z;
  const z7 = z5 * z * z;
  const z9 = z7 * z * z;

  const term1 = (z3 + z) / (4 * v);
  const term2 = (5 * z5 + 16 * z3 + 3 * z) / (96 * v2);
  const term3 = (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * v3);
  const term4 =
    (79 * z9 + 776 * z7 + 1482 * z5 - 1920 * z3 - 945 * z) / (92160 * v4);

  return z + term1 + term2 + term3 + term4;
}

export function fitCrossoverModel({
  baselineFirstLogs,
  candidateFirstLogs,
  superiorityConfidenceLevel = 0.95,
  equivalenceConfidenceLevel = 0.9,
  orderConfidenceLevel = 0.95,
  orderInteractionThreshold = 0.05,
} = {}) {
  const n1 = baselineFirstLogs.length;
  const n2 = candidateFirstLogs.length;
  if (!n1 || !n2) {
    throw new Error('comparison must contain both process-order strata');
  }
  const totalBlocks = n1 + n2;
  const degreesOfFreedom = totalBlocks - 2;

  const meanBaselineFirst = mean(baselineFirstLogs);
  const meanCandidateFirst = mean(candidateFirstLogs);

  const treatmentEffect = 0.5 * (meanBaselineFirst + meanCandidateFirst);
  const orderDifference = meanBaselineFirst - meanCandidateFirst;
  // In a 2x2 crossover trial, the difference between sequence log-ratios is
  // ȳ₁ - ȳ₂ = 2π, where π is the per-process period/order effect.
  // The unbiased estimator of the period effect is π̂ = 0.5 * (ȳ₁ - ȳ₂).
  const orderEffect = 0.5 * orderDifference;

  let rss = 0;
  for (const y of baselineFirstLogs) rss += (y - meanBaselineFirst) ** 2;
  for (const y of candidateFirstLogs) rss += (y - meanCandidateFirst) ** 2;

  const residualVariance = degreesOfFreedom > 0 ? rss / degreesOfFreedom : 0;
  const residualStandardDeviation = Math.sqrt(residualVariance);

  const seTreatment =
    residualStandardDeviation * Math.sqrt(1 / (4 * n1) + 1 / (4 * n2));
  // Variance of π̂ = 0.5 * (ȳ₁ - ȳ₂) is (1/4) * σ² * (1/n1 + 1/n2)
  const seOrder =
    residualStandardDeviation * Math.sqrt(1 / (4 * n1) + 1 / (4 * n2));

  const tSuperiority =
    degreesOfFreedom > 0
      ? studentTQuantile(
          1 - (1 - superiorityConfidenceLevel) / 2,
          degreesOfFreedom
        )
      : normalQuantile(1 - (1 - superiorityConfidenceLevel) / 2);

  const tEquivalence =
    degreesOfFreedom > 0
      ? studentTQuantile(
          1 - (1 - equivalenceConfidenceLevel) / 2,
          degreesOfFreedom
        )
      : normalQuantile(1 - (1 - equivalenceConfidenceLevel) / 2);

  const tOrder =
    degreesOfFreedom > 0
      ? studentTQuantile(orderConfidenceLevel, degreesOfFreedom)
      : normalQuantile(orderConfidenceLevel);

  const halfWidthSuperiority = tSuperiority * seTreatment;
  const halfWidthEquivalence = tEquivalence * seTreatment;
  const halfWidthOrder = tOrder * seOrder;

  const confidenceInterval = {
    low: Math.exp(treatmentEffect - halfWidthSuperiority),
    high: Math.exp(treatmentEffect + halfWidthSuperiority),
  };

  const equivalenceConfidenceInterval = {
    low: Math.exp(treatmentEffect - halfWidthEquivalence),
    high: Math.exp(treatmentEffect + halfWidthEquivalence),
  };

  const orderConfidenceInterval = {
    low: orderEffect - halfWidthOrder,
    high: orderEffect + halfWidthOrder,
  };

  const thetaOrder = Math.log(1 + orderInteractionThreshold);
  const orderIsStable =
    orderConfidenceInterval.low >= -thetaOrder &&
    orderConfidenceInterval.high <= thetaOrder;

  return {
    treatmentEffect,
    orderEffect,
    orderDifference,
    stratumEstimates: {
      baselineFirst: meanBaselineFirst,
      candidateFirst: meanCandidateFirst,
    },
    degreesOfFreedom,
    residualVariance,
    residualStandardDeviation,
    standardErrorTreatment: seTreatment,
    standardErrorOrder: seOrder,
    confidenceInterval,
    equivalenceConfidenceInterval,
    orderConfidenceInterval,
    orderIsStable,
    orderInteraction: orderEffect,
  };
}
