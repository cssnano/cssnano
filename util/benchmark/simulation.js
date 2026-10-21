// Calibration of the decision rule on synthetic paired blocks. Each run draws
// log ratios for a scenario, then follows the adaptive procedure of bench.js:
// look after every pair from block 4, stop at a verdict or at 20 blocks.
// Exits non-zero when a wrong-verdict rate leaves its band.

import { createComparisonSchedule, decide, randomFor } from './stats.js';

const MARGIN = 1.1;
const RUNS = 2000;
const REQUESTED_BLOCKS = 20;
const MINIMUM_BLOCKS = 4;
const ERROR_BAND = 0.05;

function standardNormal(random) {
  const u = Math.max(random(), Number.MIN_VALUE);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

// Student t with `tails` degrees of freedom, scaled to the declared sd. A
// scaled t3 has finite variance, so it keeps the same sd but heavier tails.
function noise(random, sd, tails) {
  const z = standardNormal(random);
  if (!tails) return sd * z;
  let chi = 0;
  for (let i = 0; i < tails; i++) chi += standardNormal(random) ** 2;
  return (sd * z * Math.sqrt((tails - 2) / tails)) / Math.sqrt(chi / tails);
}

// Each scenario fixes the true log ratio and the noise around it. Expectations
// name the wrong verdict that must stay within the band; other rows are
// reported only.
export const SCENARIOS = [
  { name: 'no change', effect: 0, sd: 0.02 },
  { name: 'no change, noisy', effect: 0, sd: 0.04 },
  { name: 'no change, heavy tails', effect: 0, sd: 0.03, tails: 3 },
  { name: 'no change, drift', effect: 0, sd: 0.02, drift: 0.003 },
  {
    name: 'no change, autocorrelated',
    effect: 0,
    sd: 0.03,
    autocorrelation: 0.6,
  },
  { name: 'regression boundary', effect: Math.log(MARGIN), sd: 0.02 },
  { name: 'equivalence boundary', effect: -Math.log(MARGIN), sd: 0.01 },
  { name: 'beyond margin', effect: Math.log(1.2), sd: 0.02 },
  { name: 'period effect 2%', effect: 0, sd: 0.02, order: 0.02 },
  { name: 'period effect 8%', effect: 0, sd: 0.02, order: 0.08 },
  { name: 'period effect 20%', effect: 0, sd: 0.02, order: 0.2 },
  { name: 'warm only, no change', effect: 0, sd: 0.03 },
  {
    name: 'two endpoints, no change',
    effect: 0,
    sd: 0.03,
    coldSd: 0.06,
    endpointRho: 0.5,
  },
];

// Wrong verdicts per scenario and the verdict whose rate must stay in band.
const EXPECTATIONS = [
  { scenario: 'no change', verdict: 'regression' },
  { scenario: 'no change', verdict: 'improvement' },
  { scenario: 'no change, noisy', verdict: 'regression' },
  { scenario: 'no change, noisy', verdict: 'improvement' },
  { scenario: 'no change, heavy tails', verdict: 'regression' },
  { scenario: 'no change, heavy tails', verdict: 'improvement' },
  { scenario: 'no change, drift', verdict: 'regression' },
  { scenario: 'no change, drift', verdict: 'improvement' },
  { scenario: 'period effect 2%', verdict: 'regression' },
  { scenario: 'period effect 2%', verdict: 'improvement' },
  { scenario: 'period effect 8%', verdict: 'regression' },
  { scenario: 'period effect 8%', verdict: 'improvement' },
  { scenario: 'regression boundary', verdict: 'regression' },
  { scenario: 'equivalence boundary', verdict: 'no-meaningful-change' },
  { scenario: 'two endpoints, no change', verdict: 'regression' },
  { scenario: 'two endpoints, no change', verdict: 'improvement' },
];

// One run of the adaptive procedure. Blocks alternate their order through the
// same schedule the benchmark uses, so the crossover model sees both strata.
export function runAdaptive(scenario, seed) {
  const random = randomFor(seed);
  const schedule = createComparisonSchedule(REQUESTED_BLOCKS, seed);
  const warm = [];
  const cold = [];
  const phi = scenario.autocorrelation ?? 0;
  const endpointRho = scenario.endpointRho ?? 0;
  let autoregressive = noise(random, scenario.sd, scenario.tails);
  for (let index = 0; index < REQUESTED_BLOCKS; index++) {
    const baselineFirst = schedule[index].processOrder[0] === 'baseline';
    if (index > 0) {
      autoregressive =
        phi * autoregressive +
        Math.sqrt(1 - phi * phi) * noise(random, scenario.sd, scenario.tails);
    }
    const drift = (index - (REQUESTED_BLOCKS - 1) / 2) * (scenario.drift ?? 0);
    const order = (scenario.order ?? 0) * (baselineFirst ? 1 : -1);
    warm.push({
      logRatio: scenario.effect + drift + autoregressive + order,
      baselineFirst,
    });
    if (scenario.coldSd) {
      // The cold start shares part of the warm noise, as both come from one
      // process and one machine state.
      const coldNoise =
        endpointRho * autoregressive +
        Math.sqrt(1 - endpointRho * endpointRho) *
          noise(random, scenario.coldSd, 0);
      cold.push({ logRatio: scenario.effect + coldNoise, baselineFirst });
    }
    const count = index + 1;
    if (count < MINIMUM_BLOCKS || count % 2 !== 0) continue;
    const decided = decide(warm).verdict !== 'inconclusive';
    const coldDecided = !cold.length || decide(cold).verdict !== 'inconclusive';
    if (decided && coldDecided) return verdictOf(warm, cold, count);
  }
  return verdictOf(warm, cold, REQUESTED_BLOCKS);
}

// Both endpoints must decide the same way; a disagreement is inconclusive.
function verdictOf(warm, cold, blocks) {
  const verdict = decide(warm).verdict;
  const coldVerdict = cold.length ? decide(cold).verdict : verdict;
  return {
    verdict: verdict === coldVerdict ? verdict : 'inconclusive',
    blocks,
  };
}

export function runCalibration(scenario, { runs = RUNS } = {}) {
  const counts = {};
  let totalBlocks = 0;
  for (let run = 1; run <= runs; run++) {
    const { verdict, blocks } = runAdaptive(
      scenario,
      `${scenario.name}-${run}`
    );
    counts[verdict] = (counts[verdict] ?? 0) + 1;
    totalBlocks += blocks;
  }
  const rates = Object.fromEntries(
    Object.entries(counts).map(([verdict, count]) => [verdict, count / runs])
  );
  return { rates, meanBlocks: totalBlocks / runs };
}

function main() {
  const byName = new Map();
  for (const scenario of SCENARIOS) {
    const result = runCalibration(scenario);
    byName.set(scenario.name, result);
    const rates = Object.entries(result.rates)
      .map(([verdict, rate]) => `${verdict} ${(rate * 100).toFixed(1)}%`)
      .join(', ');
    console.log(
      `${scenario.name.padEnd(28)} ${rates} (mean ${result.meanBlocks.toFixed(1)} blocks)`
    );
  }
  const failures = EXPECTATIONS.filter(({ scenario, verdict }) => {
    const rate = byName.get(scenario).rates[verdict] ?? 0;
    return rate > ERROR_BAND;
  });
  for (const { scenario, verdict } of failures) {
    console.error(
      `${scenario}: wrong verdict "${verdict}" above ${ERROR_BAND}`
    );
  }
  if (failures.length) process.exitCode = 1;
}

if (process.argv[1] === import.meta.filename) main();
