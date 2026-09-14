import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeComparison } from './compare-analysis.mjs';
import {
  runCalibration,
  simulatedArtifact,
} from './statistical-simulation.mjs';

test('statistical simulation is deterministic and exercises the primary contract', () => {
  const first = analyzeComparison(
    simulatedArtifact({ effect: 0.01, sd: 0.01 }, 7, 100)
  );
  assert.deepEqual(
    analyzeComparison(simulatedArtifact({ effect: 0.01, sd: 0.01 }, 7, 100)),
    first
  );
  assert.equal(first.total.endpoint, 'TOTAL');
  assert.equal(first.rows[0].exploratory, true);
});

test('calibration reports the declared operating characteristics', () => {
  const result = runCalibration({ replicates: 2, resamples: 50 });
  assert.equal(result.results.length, 13);
  assert.ok(result.results.every((row) => 'primaryIntervalCoverage' in row));
});
