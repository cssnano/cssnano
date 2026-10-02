import assert from 'node:assert/strict';
import { test } from 'node:test';
import { snapshot } from '../benchTestHelpers.js';
import { compareSnapshots } from '../compare-snapshots.js';

test('comparison verdicts distinguish improvement, regression, and noise', () => {
  assert.equal(
    compareSnapshots(
      snapshot([100, 100, 100, 100, 100]),
      snapshot([80, 80, 80, 80, 80])
    ).total.verdict,
    'improvement'
  );
  assert.equal(
    compareSnapshots(
      snapshot([100, 100, 100, 100, 100]),
      snapshot([120, 120, 120, 120, 120])
    ).total.verdict,
    'regression'
  );
  assert.equal(
    compareSnapshots(
      snapshot([100, 100, 100, 100, 100]),
      snapshot([80, 120, 90, 110, 100])
    ).total.verdict,
    'inconclusive'
  );
});

test('comparison results expose only report fields', () => {
  const result = compareSnapshots(
    snapshot([100, 100, 100, 100, 100]),
    snapshot([90, 90, 90, 90, 90])
  );
  assert.deepEqual(Object.keys(result.total).toSorted(), [
    'baseMedianMs',
    'baseReplicateCount',
    'baseSampleCount',
    'candidateMedianMs',
    'candidateReplicateCount',
    'candidateSampleCount',
    'confidenceIntervalPct',
    'endpoint',
    'medianDeltaPct',
    'replicateCount',
    'spreadPct',
    'verdict',
  ]);
  assert.deepEqual(Object.keys(result.rows[0]).toSorted(), [
    'baseMedianMs',
    'baseReplicateCount',
    'baseSampleCount',
    'bytes',
    'candidateMedianMs',
    'candidateReplicateCount',
    'candidateSampleCount',
    'confidenceIntervalPct',
    'medianDeltaPct',
    'name',
    'replicateCount',
    'spreadPct',
    'verdict',
  ]);
});

test('comparison rejects output changes and compares maximum RSS', () => {
  const base = snapshot([100, 100, 100, 100, 100]);
  const candidate = snapshot([90, 90, 90, 90, 90]);
  for (const run of candidate.runs) run.outputHashes.fixture = 'different-hash';
  assert.throws(
    () => compareSnapshots(base, candidate),
    /output hash differs for "fixture"/v
  );

  const result = compareSnapshots(base, snapshot([90, 90, 90, 90, 90]));
  assert.equal(result.maxRSS.baseMedian, 1002);
  assert.equal(result.maxRSS.candidateMedian, 1002);
  assert.equal(result.maxRSS.medianDeltaPct, 0);
});

test('comparison accepts only explicitly allowlisted output changes', () => {
  const base = snapshot([100, 100, 100, 100, 100]);
  const candidate = snapshot([90, 90, 90, 90, 90]);
  const baseHash = base.runs[0].outputHashes.fixture;
  const candidateHash = 'different-hash';
  for (const run of candidate.runs) run.outputHashes.fixture = candidateHash;
  candidate.outputHashes = { fixture: candidateHash };
  base.outputHashes = { fixture: baseHash };

  assert.doesNotThrow(() =>
    compareSnapshots(base, candidate, {
      outputHashAllowlist: new Map([
        ['fixture', { base: baseHash, candidate: candidateHash }],
      ]),
    })
  );
  assert.throws(
    () =>
      compareSnapshots(base, candidate, {
        outputHashAllowlist: new Map([
          ['fixture', { base: 'wrong', candidate: candidateHash }],
        ]),
      }),
    /hash differs.*base hash "hash".*candidate hash "different-hash"/v
  );
});

test('comparison does not apply a point-estimate minimum detectable effect', () => {
  // A precise small effect is no longer filtered by a point-estimate threshold.
  const base = snapshot([100, 100, 100, 100, 100]);
  const candidate = snapshot([99.8, 99.8, 99.8, 99.8, 99.8]);
  assert.equal(compareSnapshots(base, candidate).total.verdict, 'improvement');

  // The same applies to a precise small regression.
  const candidateReg = snapshot([100.2, 100.2, 100.2, 100.2, 100.2]);
  assert.equal(
    compareSnapshots(base, candidateReg).total.verdict,
    'regression'
  );
});

test('comparison marks runs with fewer than three replicates as inconclusive', () => {
  // Delta of -20% would be an improvement, but with only 2 runs it lacks statistical degrees of freedom
  const base = snapshot([100, 100]);
  const candidate = snapshot([80, 80]);
  const result = compareSnapshots(base, candidate);
  assert.equal(result.total.verdict, 'inconclusive');
  assert.match(result.warning, /fewer than three independent replicates/iv);
});

test('comparison medianDeltaPct is consistent with reported base and candidate medians', () => {
  const base = snapshot([100, 105, 95, 102, 98]); // base median = 100
  const candidate = snapshot([95, 90, 98, 92, 95]); // candidate median = 95
  const result = compareSnapshots(base, candidate);
  assert.equal(result.total.baseMedianMs, 100);
  assert.equal(result.total.candidateMedianMs, 95);
  assert.equal(result.total.medianDeltaPct, -5);
});

test('comparison verdict is invariant to replicate index permutation', () => {
  const base = snapshot([100, 105, 95, 102, 98]);
  // Candidate values in original order vs permuted order
  const candA = snapshot([90, 95, 96, 92, 90]);
  const candB = snapshot([95, 90, 90, 96, 92]);
  const resultA = compareSnapshots(base, candA);
  const resultB = compareSnapshots(base, candB);
  assert.equal(resultA.total.verdict, resultB.total.verdict);
  assert.equal(resultA.total.medianDeltaPct, resultB.total.medianDeltaPct);
});

test('per-framework rows with sub-threshold timing (< 5ms) are inconclusive due to low signal', () => {
  const base = snapshot([100, 100, 100, 100, 100]);
  const candidate = snapshot([80, 80, 80, 80, 80]);
  // Set framework timing below MIN_USEFUL_SAMPLE_MS (5ms)
  for (const run of base.runs) {
    run.summary.frameworks[0].medianMs = 2.0;
    run.perFileSamples.fixture = [2.0];
  }
  for (const run of candidate.runs) {
    run.summary.frameworks[0].medianMs = 1.5;
    run.perFileSamples.fixture = [1.5];
  }
  const result = compareSnapshots(base, candidate);
  assert.equal(result.total.verdict, 'improvement');
  assert.equal(result.rows[0].verdict, 'inconclusive');
});

test('comparison uses retained measured samples instead of only run summaries', () => {
  const base = snapshot([100, 100, 100]);
  const candidate = snapshot([90, 90, 90]);
  for (const run of base.runs) {
    run.totalSamples = [100, 101, 99, 100, 100];
    run.perFileSamples = { fixture: [100, 101, 99, 100, 100] };
  }
  for (const run of candidate.runs) {
    run.totalSamples = [90, 91, 89, 90, 90];
    run.perFileSamples = { fixture: [90, 91, 89, 90, 90] };
  }
  const result = compareSnapshots(base, candidate);
  assert.equal(result.total.baseMedianMs, 100);
  assert.equal(result.total.candidateMedianMs, 90);
  assert.equal(result.total.baseSampleCount, 15);
  assert.equal(result.total.candidateSampleCount, 15);
  assert.equal(result.total.replicateCount, 3);
});

test('independent comparisons do not require matching run indexes or counts', () => {
  const base = snapshot([100, 100, 100]);
  const candidate = snapshot([90, 90, 90, 90]);
  candidate.runs = candidate.runs.map((run, index) => ({
    ...run,
    index: (index + 1) * 10,
  }));
  const result = compareSnapshots(base, candidate);
  assert.equal(result.total.verdict, 'improvement');
  assert.equal(result.total.replicateCount, 3);
  assert.equal(result.total.candidateSampleCount, 4);
});
