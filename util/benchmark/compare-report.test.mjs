import assert from 'node:assert/strict';
import { test } from 'node:test';
import { markdownComparison, printComparison } from './compare-report.mjs';

function createMockResult({
  direction = 'slower',
  practical = 'within-margin',
  verdict = 'inconclusive',
  margin = 1.1,
} = {}) {
  return {
    configuration: {
      practicalEquivalenceMargin: margin,
    },
    base: {
      label: 'baseline',
      path: '/path/to/base',
      preset: 'default',
      target: 'cssnano',
      corpusManifest: 'manifest-hash',
      gitRevision: 'abc1234',
      seed: 42,
    },
    candidate: {
      label: 'candidate',
      path: '/path/to/cand',
      preset: 'default',
      target: 'cssnano',
      corpusManifest: 'manifest-hash',
      gitRevision: 'def5678',
      seed: 42,
    },
    rows: [
      {
        name: 'test-fixture',
        baseMedianMs: 100,
        candidateMedianMs: 105,
        medianDeltaPct: 5,
        confidenceIntervalPct: { low: 2, high: 8 },
        equivalenceConfidenceInterval: { low: 1.02, high: 1.08 },
        statisticalDirection: direction,
        practicalConclusion: practical,
      },
    ],
    total: {
      baseMedianMs: 100,
      candidateMedianMs: 105,
      medianDeltaPct: 5,
      confidenceIntervalPct: { low: 2, high: 8 },
      equivalenceConfidenceInterval: { low: 1.02, high: 1.08 },
      statisticalDirection: direction,
      practicalConclusion: practical,
    },
    precision: {
      confidenceIntervalWidth: 0.06,
      precisionTarget: 0.1,
      requestedBlocks: 10,
      precisionAchieved: true,
    },
    overallVerdict: verdict,
    structuralFailure: false,
  };
}

test('markdownComparison includes statistical direction, practical tolerance, and actionable verdict', () => {
  const result = createMockResult({
    direction: 'faster',
    practical: 'outside-margin',
    verdict: 'improvement',
  });
  const md = markdownComparison(result);
  assert.match(md, /- Statistical Direction: \*\*faster\*\*/v);
  assert.match(
    md,
    /- Practical Tolerance \(10% margin\): \*\*outside-margin\*\*/v
  );
  assert.match(md, /- Actionable Verdict: \*\*improvement\*\*/v);
  assert.doesNotMatch(md, /Slowdown observed but confirmed/v);
});

test('markdownComparison includes footnote for within-margin slowdown', () => {
  const result = createMockResult({
    direction: 'slower',
    practical: 'within-margin',
    verdict: 'inconclusive',
  });
  const md = markdownComparison(result);
  assert.match(md, /- Statistical Direction: \*\*slower\*\*/v);
  assert.match(
    md,
    /- Practical Tolerance \(10% margin\): \*\*within-margin\*\*/v
  );
  assert.match(md, /- Actionable Verdict: \*\*inconclusive\*\*/v);
  assert.match(
    md,
    /> Note: Slowdown observed but confirmed within the accepted 10% non-regression margin; no gating action required\./v
  );
});

test('printComparison prints direction, tolerance, actionable verdict and footnote to console', () => {
  const result = createMockResult({
    direction: 'slower',
    practical: 'within-margin',
    verdict: 'inconclusive',
  });
  const logged = [];
  const originalLog = console.log;
  console.log = (...args) => logged.push(args.join(' '));
  try {
    printComparison(result);
  } finally {
    console.log = originalLog;
  }
  const output = logged.join('\n');
  assert.match(output, /Statistical Direction: slower/v);
  assert.match(output, /Practical Tolerance \(10% margin\): within-margin/v);
  assert.match(output, /Actionable Verdict: inconclusive/v);
  assert.match(
    output,
    /Note: Slowdown observed but confirmed within the accepted 10% non-regression margin; no gating action required\./v
  );
});
