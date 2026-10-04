import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { analyzeComparison } from '../compare-analysis.js';
import { resolveBenchmarkTarget } from '../bench-cases.js';
import {
  blockSummary,
  commandFor,
  comparisonResultFor,
  executeComparison,
} from '../compare-revisions.js';

import { mockProvenance as provenance } from '../benchTestHelpers.js';
import {
  childConfiguration,
  config,
  observation,
} from '../comparisonTestHelpers.js';

test('coordinator starts a fresh observation for each side of each block', () => {
  let calls = 0;
  const processIds = [];
  const artifact = executeComparison(
    config({ blocks: 4, requestedBlocks: 4 }),
    (...args) => {
      calls++;
      processIds.push(
        Number(
          spawnSync(
            process.execPath,
            ['-e', 'process.stdout.write(String(process.pid))'],
            { encoding: 'utf8' }
          ).stdout
        )
      );
      const side = args[1];
      const blockId = args[2];
      let value;
      if (side === 'baseline') value = blockId % 2 ? 120 : 100;
      else value = blockId % 2 ? 100 : 120;
      return {
        exitStatus: 0,
        structuralValidity: true,
        provenance: provenance(
          side === 'baseline'
            ? config().baseRevision
            : config().candidateRevision
        ),
        configuration: childConfiguration(args[0]),
        run: observation(value),
      };
    }
  );
  assert.equal(calls, 8);
  assert.equal(processIds.length, 8);
  assert.ok(processIds.every((processId) => processId !== process.pid));
  const result = analyzeComparison(artifact);
  assert.equal(result.total.statisticalDirection, 'inconclusive');
});

test('output mismatch is a structural failure before performance analysis', () => {
  const artifact = executeComparison(
    config({ blocks: 6, requestedBlocks: 6 }),
    (...args) => ({
      exitStatus: 0,
      structuralValidity: true,
      provenance: provenance(
        args[1] === 'baseline'
          ? config().baseRevision
          : config().candidateRevision
      ),
      configuration: childConfiguration(args[0]),
      run: observation(100, args[1] === 'candidate' ? 'different' : 'same'),
    })
  );
  const result = analyzeComparison(artifact);
  assert.equal(result.structuralFailure, true);
  assert.equal(result.overallVerdict, 'inconclusive');
});

test('coordinator records both exit statuses when the first process fails', () => {
  const values = config({ blocks: 4, requestedBlocks: 6 });
  const artifact = executeComparison(values, (_config, side) => {
    if (side === 'candidate') {
      return {
        exitStatus: 17,
        structuralValidity: false,
        error: 'child failed',
      };
    }
    return {
      exitStatus: 0,
      structuralValidity: true,
      provenance: provenance(values.baseRevision),
      configuration: childConfiguration(values),
      run: observation(100),
    };
  });

  assert.deepEqual(Object.keys(artifact.blocks[0].exitStatus).toSorted(), [
    'baseline',
    'candidate',
  ]);
  assert.equal(artifact.blocks[0].exitStatus.candidate, 17);
  assert.equal(artifact.blocks[0].exitStatus.baseline, 0);
  const result = analyzeComparison(artifact);
  assert.equal(result.structuralFailure, true);
  assert.equal(result.overallVerdict, 'inconclusive');
});

test('coordinator rejects more executed blocks than requested', () => {
  assert.throws(
    () => executeComparison(config({ blocks: 6, requestedBlocks: 5 })),
    /blocks must not exceed requested blocks/v
  );
});

test('coordinator requires complete order-balanced block pairs', () => {
  assert.throws(
    () => executeComparison(config({ blocks: 5, requestedBlocks: 6 })),
    /blocks must be an even number/v
  );
});

test('coordinator rejects two blocks, which leave no residual degree of freedom', () => {
  assert.throws(
    () =>
      executeComparison(
        config({ blocks: 2, requestedBlocks: 2, minimumBlocks: 2 })
      ),
    /blocks must be at least 4/v
  );
});

test('coordinator rejects an adaptive plan of two requested blocks', () => {
  // Adaptive runs plan --requested-blocks and ignore --blocks.
  assert.throws(
    () =>
      executeComparison(
        config({
          adaptive: true,
          blocks: 20,
          requestedBlocks: 2,
          minimumBlocks: 2,
        })
      ),
    /requested blocks must be at least 4/v
  );
});

test('snapshot and comparison metadata share one benchmark target resolver', () => {
  assert.equal(
    resolveBenchmarkTarget('selector-fixed-point'),
    'postcss-minify-selectors'
  );
  assert.equal(resolveBenchmarkTarget(), 'cssnano');
  assert.throws(
    () => resolveBenchmarkTarget('not-a-case'),
    /unknown benchmark case/v
  );

  const artifact = executeComparison(
    config({ case: 'selector-fixed-point', blocks: 4, requestedBlocks: 4 }),
    (values, side) => ({
      exitStatus: 0,
      structuralValidity: true,
      provenance: provenance(
        side === 'baseline' ? config().baseRevision : config().candidateRevision
      ),
      configuration: childConfiguration(values),
      run: observation(100),
    })
  );
  assert.equal(
    artifact.configuration.target,
    resolveBenchmarkTarget('selector-fixed-point')
  );
});

test('quiet children receive --quiet and the coordinator summarizes each block', () => {
  const values = config({ blocks: 4, requestedBlocks: 4, quietChild: true });
  const args = commandFor(
    values,
    'baseline',
    1,
    values.baseDir,
    values.baseRevision,
    values.resultsDir
  );
  assert.ok(args.includes('--quiet'));
  assert.ok(args.includes('--run-index=1'));
  assert.ok(!args.some((arg) => arg.startsWith('--bootstrap-')));

  const artifact = executeComparison(values, (cfg, side, blockId) => {
    const value = blockId === 1 ? 100 : 120;
    return {
      exitStatus: 0,
      structuralValidity: true,
      provenance: provenance(
        side === 'baseline' ? values.baseRevision : values.candidateRevision
      ),
      configuration: childConfiguration(cfg),
      run: observation(value),
    };
  });
  assert.match(
    blockSummary(artifact.blocks[0], 2),
    /^block 1\/2: baseline 100 ms, candidate 100 ms/v
  );
  assert.equal(blockSummary({ blockId: 3, observations: {} }, 2), null);
});

test('blockSummary appends the time left at the pace of the finished blocks', () => {
  const block = {
    blockId: 2,
    durationMs: 90_000,
    observations: {
      baseline: { run: { totalSamples: [10] } },
      candidate: { run: { totalSamples: [12] } },
    },
  };
  assert.equal(
    blockSummary(block, 6),
    'block 2/6: baseline 10 ms, candidate 12 ms; about 6 min left at this pace'
  );
});

test('blockSummary omits the time left after the last block', () => {
  const block = {
    blockId: 4,
    durationMs: 90_000,
    observations: {
      baseline: { run: { totalSamples: [10] } },
      candidate: { run: { totalSamples: [12] } },
    },
  };
  assert.equal(
    blockSummary(block, 4),
    'block 4/4: baseline 10 ms, candidate 12 ms'
  );
});

function runMockComparison(values, getTiming = () => 100) {
  const timingFn =
    typeof getTiming === 'function' ? getTiming : () => getTiming;
  return executeComparison(values, (cfg, side) => ({
    exitStatus: 0,
    structuralValidity: true,
    provenance: provenance(
      side === 'baseline' ? values.baseRevision : values.candidateRevision
    ),
    configuration: childConfiguration(cfg),
    run: observation(timingFn(side)),
  }));
}

test('adaptive comparisons stop once the requested precision is reached', () => {
  const values = config({
    adaptive: true,
    requestedBlocks: 10,
    minimumBlocks: 2,
    pilotBlocks: 2,
    blocks: 10,
  });
  const artifact = runMockComparison(values, (side) =>
    side === 'baseline' ? 100 : 80
  );
  assert.ok(artifact.blocks.length < 10);
  assert.ok(artifact.blocks.length >= 2);
  assert.equal(artifact.adaptiveStop.reason, 'requested precision reached');
  assert.equal(artifact.configuration.actualBlocks, artifact.blocks.length);
  const result = analyzeComparison(artifact);
  assert.equal(result.total.statisticalDirection, 'faster');
  assert.equal(result.precision.precisionAchieved, true);
  assert.equal(result.overallVerdict, 'improvement');
});

test('comparison metadata records repeated corpus selectors as an array', () => {
  const values = config({
    blocks: 4,
    requestedBlocks: 4,
    only: ['framework-a', 'framework-b'],
  });
  const artifact = runMockComparison(values, 100);
  assert.deepEqual(artifact.configuration.corpusSelector, [
    'framework-a',
    'framework-b',
  ]);
});

test('comparisonResultFor analyzes the artifact with the shared verdict taxonomy', () => {
  const values = config({ blocks: 6, requestedBlocks: 6 });
  const artifact = executeComparison(values, (cfg, side, blockId) => {
    const value = blockId % 2 ? 100 : 100;
    return {
      exitStatus: 0,
      structuralValidity: true,
      provenance: provenance(
        side === 'baseline' ? values.baseRevision : values.candidateRevision
      ),
      configuration: childConfiguration(cfg),
      run: observation(value),
    };
  });
  const result = comparisonResultFor(values, artifact);
  assert.equal(result.base.label, 'baseline');
  assert.equal(result.candidate.gitRevision, values.candidateRevision);
  assert.deepEqual(result.verdictBasis, {
    direction: 'inconclusive',
    precision: 'achieved',
    order: result.verdictBasis.order,
    blocks: 'sufficient',
  });
  assert.ok(result.total);
});
