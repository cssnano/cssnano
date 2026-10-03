import { mean } from './bench-stats.js';

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

  const rationalTail = (val) =>
    (((((c[0] * val + c[1]) * val + c[2]) * val + c[3]) * val + c[4]) * val +
      c[5]) /
    ((((d[0] * val + d[1]) * val + d[2]) * val + d[3]) * val + 1);

  if (probability < pLow) {
    const q = Math.sqrt(-2 * Math.log(probability));
    return rationalTail(q);
  }

  if (probability <= pHigh) {
    const q = probability - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }

  const q = Math.sqrt(-2 * Math.log(1 - probability));
  return -rationalTail(q);
}

export function studentTQuantile(probability, degreesOfFreedom) {
  if (probability <= 0 || probability >= 1) {
    throw new RangeError('probability must be in (0, 1)');
  }
  if (!Number.isInteger(degreesOfFreedom) || degreesOfFreedom < 1) {
    throw new RangeError('degreesOfFreedom must be a positive integer');
  }

  // The series below diverges at tiny df, but df 1 and 2 have closed forms.
  if (degreesOfFreedom === 1) return Math.tan(Math.PI * (probability - 0.5));
  if (degreesOfFreedom === 2) {
    return (
      (2 * probability - 1) / Math.sqrt(2 * probability * (1 - probability))
    );
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
  // Without residual degrees of freedom the variance is unidentifiable, and
  // reporting zero would claim perfect precision.
  if (degreesOfFreedom < 1) {
    throw new RangeError('crossover model needs at least three blocks');
  }

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

  const residualVariance = rss / degreesOfFreedom;
  const residualStandardDeviation = Math.sqrt(residualVariance);

  const seTreatment =
    residualStandardDeviation * Math.sqrt(1 / (4 * n1) + 1 / (4 * n2));
  // Variance of π̂ = 0.5 * (ȳ₁ - ȳ₂) is (1/4) * σ² * (1/n1 + 1/n2)
  const seOrder =
    residualStandardDeviation * Math.sqrt(1 / (4 * n1) + 1 / (4 * n2));

  const tSuperiority = studentTQuantile(
    1 - (1 - superiorityConfidenceLevel) / 2,
    degreesOfFreedom
  );

  const tEquivalence = studentTQuantile(
    1 - (1 - equivalenceConfidenceLevel) / 2,
    degreesOfFreedom
  );

  const tOrder = studentTQuantile(orderConfidenceLevel, degreesOfFreedom);

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
