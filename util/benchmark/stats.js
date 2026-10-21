// Decision rule for paired benchmark blocks, and the seeded schedule that
// orders each pair. Pure functions: no I/O and no process state, so the
// adaptive loop and the simulation call the same code.

import { createHash } from 'node:crypto';
import { studentTQuantile } from './distributions.js';

const BASELINE = 'baseline';
const CANDIDATE = 'candidate';

// Each look at an adaptive run uses a stricter level than its nominal one,
// as in Pocock's group-sequential design, so a change at the margin is wrongly
// decided in about 5% of runs.
const SUPERIORITY_CONFIDENCE_LEVEL = 0.99;
const EQUIVALENCE_CONFIDENCE_LEVEL = 0.98;
const RUNTIME_NON_REGRESSION_MARGIN = 1.1;
const ORDER_INTERACTION_THRESHOLD = 0.05;

function quantile(sorted, q) {
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

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values) {
  return quantile(
    [...values].toSorted((a, b) => a - b),
    0.5
  );
}

// Seeded 32-bit linear congruential generator shared by the schedule and the
// simulation so one seed means one stream everywhere.
// A cryptographic digest mixes every character into every bit. A weak
// additive hash would make neighbouring seeds produce streams that differ by
// one shared offset, so simulation replicates would not be independent.
export function seedNumber(seed) {
  const digest = createHash('sha256').update(String(seed)).digest();
  return digest.readUInt32BE(0) || 1;
}

export function randomFor(seed) {
  let state = seedNumber(seed);
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Create a reproducible balanced order with block-pair randomization.
 * Each 2-block pair contains one baseline-first and one candidate-first
 * block; a seeded coin decides which comes first. The coin reads the high
 * bits of the generator, because the lowest bit of a power-of-two LCG simply
 * alternates and would make every seed the same ABBA pattern.
 */
export function createComparisonSchedule(blockCount, seed) {
  if (!Number.isInteger(blockCount) || blockCount < 1) {
    throw new RangeError('comparison block count must be a positive integer');
  }
  if (typeof seed !== 'string' || !seed) {
    throw new TypeError('comparison schedule seed must be a non-empty string');
  }
  const random = randomFor(seed);
  let baselineFirst = true;
  return Array.from({ length: blockCount }, (_, index) => {
    const blockId = index + 1;
    if (index % 2 === 0) baselineFirst = random() < 0.5;
    const pairFirst = baselineFirst ? BASELINE : CANDIDATE;
    const pairSecond = baselineFirst ? CANDIDATE : BASELINE;
    const order = index % 2 === 0 ? pairFirst : pairSecond;
    return {
      blockId,
      processOrder:
        order === BASELINE ? [BASELINE, CANDIDATE] : [CANDIDATE, BASELINE],
    };
  });
}

export function scheduleBalance(schedule) {
  const counts = { baselineFirst: 0, candidateFirst: 0 };
  for (const block of schedule) {
    if (block.processOrder?.[0] === BASELINE) counts.baselineFirst++;
    else if (block.processOrder?.[0] === CANDIDATE) counts.candidateFirst++;
    else throw new Error(`invalid process order for block ${block.blockId}`);
  }
  return counts;
}

// Order effects are estimated at the conventional 95% level; only their
// threshold test decides whether an interaction blocks a verdict.
const ORDER_CONFIDENCE_LEVEL = 0.95;

/**
 * A 2x2 crossover fit of log runtime ratios, one entry per block.
 * Both process-order strata must be present, and the residual variance needs
 * at least one degree of freedom.
 * @param {{ logRatio: number, baselineFirst: boolean }[]} blocks
 */
export function crossoverFit(blocks) {
  const baselineFirst = blocks
    .filter((block) => block.baselineFirst)
    .map((block) => block.logRatio);
  const candidateFirst = blocks
    .filter((block) => !block.baselineFirst)
    .map((block) => block.logRatio);
  if (!baselineFirst.length || !candidateFirst.length) {
    throw new Error('comparison must contain both process-order strata');
  }
  const degreesOfFreedom = blocks.length - 2;
  if (degreesOfFreedom < 1) {
    throw new RangeError('crossover model needs at least three blocks');
  }

  const meanBaselineFirst = mean(baselineFirst);
  const meanCandidateFirst = mean(candidateFirst);
  let residualSquares = 0;
  for (const y of baselineFirst) {
    residualSquares += (y - meanBaselineFirst) ** 2;
  }
  for (const y of candidateFirst) {
    residualSquares += (y - meanCandidateFirst) ** 2;
  }
  const residualSd = Math.sqrt(residualSquares / degreesOfFreedom);
  // The treatment and the period (order) effects share one standard error in
  // a balanced 2x2 crossover.
  const standardError =
    residualSd *
    Math.sqrt(1 / (4 * baselineFirst.length) + 1 / (4 * candidateFirst.length));

  return {
    treatment: 0.5 * (meanBaselineFirst + meanCandidateFirst),
    order: 0.5 * (meanBaselineFirst - meanCandidateFirst),
    degreesOfFreedom,
    standardError,
  };
}

// Interval for the log ratio at one confidence level, exponentiated to a
// runtime ratio.
function ratioInterval(center, standardError, degreesOfFreedom, level) {
  const halfWidth =
    studentTQuantile(1 - (1 - level) / 2, degreesOfFreedom) * standardError;
  return {
    low: Math.exp(center - halfWidth),
    high: Math.exp(center + halfWidth),
  };
}

/**
 * Decide one endpoint against the practical margin. A verdict needs a stable
 * process order; otherwise the result is inconclusive.
 * @param {{ logRatio: number, baselineFirst: boolean }[]} blocks
 * @param {object} [options]
 * @returns {{
 *   ratio: number,
 *   interval: { low: number, high: number },
 *   equivalence: { low: number, high: number },
 *   orderEffect: number,
 *   orderStable: boolean,
 *   verdict: 'regression' | 'improvement' | 'no-meaningful-change' | 'inconclusive'
 * }}
 */
export function decide(blocks, options = {}) {
  const {
    margin = RUNTIME_NON_REGRESSION_MARGIN,
    superiorityConfidenceLevel = SUPERIORITY_CONFIDENCE_LEVEL,
    equivalenceConfidenceLevel = EQUIVALENCE_CONFIDENCE_LEVEL,
    orderInteractionThreshold = ORDER_INTERACTION_THRESHOLD,
  } = options;
  const fit = crossoverFit(blocks);
  const { treatment, order, degreesOfFreedom, standardError } = fit;

  const interval = ratioInterval(
    treatment,
    standardError,
    degreesOfFreedom,
    superiorityConfidenceLevel
  );
  const equivalence = ratioInterval(
    treatment,
    standardError,
    degreesOfFreedom,
    equivalenceConfidenceLevel
  );
  const orderHalfWidth =
    studentTQuantile(1 - (1 - ORDER_CONFIDENCE_LEVEL) / 2, degreesOfFreedom) *
    standardError;
  // An order effect that noise cannot place beyond the threshold is treated
  // as a period effect the balanced schedule cancels.
  const threshold = Math.log(1 + orderInteractionThreshold);
  const orderStable =
    order - orderHalfWidth <= threshold && order + orderHalfWidth >= -threshold;

  let verdict = 'inconclusive';
  if (orderStable) {
    if (interval.low > margin) verdict = 'regression';
    else if (interval.high < 1 / margin) verdict = 'improvement';
    else if (equivalence.low >= 1 / margin && equivalence.high <= margin) {
      verdict = 'no-meaningful-change';
    }
  }

  return {
    ratio: Math.exp(treatment),
    interval,
    equivalence,
    orderEffect: order,
    orderStable,
    verdict,
  };
}
