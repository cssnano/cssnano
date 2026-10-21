// Normal and Student t quantiles behind the benchmark's confidence intervals.

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

// Lanczos approximation (g = 7), accurate to about 15 digits for x > 0.
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function logGamma(x) {
  if (x < 0.5)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  const shifted = x - 1;
  let sum = LANCZOS[0];
  for (let i = 1; i < LANCZOS.length; i++) sum += LANCZOS[i] / (shifted + i);
  const t = shifted + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (shifted + 0.5) * Math.log(t) -
    t +
    Math.log(sum)
  );
}

// Continued fraction for the regularized incomplete beta function (modified
// Lentz algorithm), valid where x < (a + 1) / (a + b + 2).
function betaContinuedFraction(x, a, b) {
  const tiny = 1e-300;
  const guard = (value) => (Math.abs(value) < tiny ? tiny : value);
  let c = 1;
  let d = 1 / guard(1 - ((a + b) * x) / (a + 1));
  let result = d;
  for (let m = 1; m <= 200; m++) {
    const even = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 / guard(1 + even * d);
    c = guard(1 + even / c);
    result *= d * c;
    const odd = (-(a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 / guard(1 + odd * d);
    c = guard(1 + odd / c);
    const delta = d * c;
    result *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  return result;
}

function regularizedIncompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x)
  );
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(x, a, b)) / a
    : 1 - (front * betaContinuedFraction(1 - x, b, a)) / b;
}

function studentTCumulative(t, degreesOfFreedom) {
  const tail =
    0.5 *
    regularizedIncompleteBeta(
      degreesOfFreedom / (degreesOfFreedom + t * t),
      degreesOfFreedom / 2,
      0.5
    );
  return t > 0 ? 1 - tail : tail;
}

function studentTDensity(t, v) {
  return Math.exp(
    logGamma((v + 1) / 2) -
      logGamma(v / 2) -
      0.5 * Math.log(v * Math.PI) -
      ((v + 1) / 2) * Math.log(1 + (t * t) / v)
  );
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

  // The series is a start only: it runs about 1% low at a handful of degrees
  // of freedom, which are exactly the early adaptive looks. Newton steps on
  // the exact distribution function remove that error.
  let t = z + term1 + term2 + term3 + term4;
  for (let i = 0; i < 8; i++) {
    const step =
      (studentTCumulative(t, v) - probability) / studentTDensity(t, v);
    t -= step;
    if (Math.abs(step) < 1e-12 * Math.max(1, Math.abs(t))) break;
  }
  return t;
}
