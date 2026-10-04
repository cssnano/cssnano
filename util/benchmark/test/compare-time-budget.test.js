import assert from 'node:assert/strict';
import { test } from 'node:test';
import { executeComparison } from '../compare-revisions.js';
import { mockProvenance as provenance } from '../benchTestHelpers.js';
import {
  childConfiguration,
  config,
  observation,
} from '../comparisonTestHelpers.js';

function clockedComparison(values, secondsPerProcess) {
  let now = 0;
  const artifact = executeComparison(
    values,
    (cfg, side) => {
      now += secondsPerProcess * 1000;
      return {
        exitStatus: 0,
        structuralValidity: true,
        provenance: provenance(
          side === 'baseline' ? values.baseRevision : values.candidateRevision
        ),
        configuration: childConfiguration(cfg),
        // Alternating timings keep the interval too wide to stop on precision.
        run: observation(side === 'baseline' ? 100 : 100 + (now % 7) * 20),
      };
    },
    () => now
  );
  return artifact;
}

const budgeted = (timeBudgetMs) =>
  config({
    adaptive: true,
    requestedBlocks: 20,
    blocks: 20,
    minimumBlocks: 4,
    pilotBlocks: 4,
    precisionTarget: 0.0001,
    timeBudgetMs,
  });

test('a time budget stops before the pair of blocks that would exceed it', () => {
  // 10 s per block: 4 blocks take 40 s and a fifth and sixth would end at 80 s.
  const artifact = clockedComparison(budgeted(75_000), 5);
  assert.equal(artifact.blocks.length, 6);
  assert.equal(artifact.adaptiveStop.reason, 'time budget reached');
});

test('a time budget never cuts the run below the minimum blocks', () => {
  const artifact = clockedComparison(budgeted(1_000), 5);
  assert.equal(artifact.blocks.length, 4);
});

test('a run without a time budget keeps scheduling blocks', () => {
  const artifact = clockedComparison(budgeted(undefined), 5);
  assert.equal(artifact.blocks.length, 20);
});
