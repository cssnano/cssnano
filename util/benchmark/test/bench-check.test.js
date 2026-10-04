import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  casesForPackage,
  fastProfileFlags,
  parseCheckArgs,
  resolveRevision,
  summaryFor,
} from '../bench-check.js';

const cases = {
  a: { plugin: 'postcss-merge-rules' },
  b: { plugin: 'postcss-merge-longhand' },
  c: { plugin: 'postcss-merge-rules' },
};

test('casesForPackage lists the focused cases of that plugin only', () => {
  assert.deepEqual(casesForPackage('postcss-merge-rules', cases), ['a', 'c']);
});

test('casesForPackage names the known plugins when none matches', () => {
  assert.throws(
    () => casesForPackage('postcss-nope', cases),
    /no focused benchmark case for "postcss-nope".*postcss-merge-longhand, postcss-merge-rules/v
  );
});

test('fastProfileFlags starts at the minimum even number of blocks and lets the time budget decide the rest', () => {
  const flags = fastProfileFlags(30_000);
  assert.deepEqual(
    [
      '--adaptive',
      '--minimum-blocks=4',
      '--pilot-blocks=4',
      '--time-budget=30s',
    ].filter((flag) => !flags.includes(flag)),
    []
  );
});

test('parseCheckArgs reads the total budget as a duration', () => {
  const args = parseCheckArgs(['--case=a', '--budget=3m']);
  assert.equal(args.budgetMs, 180_000);
});

test('parseCheckArgs defaults the total budget to two minutes', () => {
  assert.equal(parseCheckArgs(['--case=a']).budgetMs, 120_000);
});

test('parseCheckArgs rejects a budget that is not a duration', () => {
  assert.throws(
    () => parseCheckArgs(['--case=a', '--budget=fast']),
    /--budget must be a duration such as 90s or 5m/v
  );
});

test('parseCheckArgs defaults to the base HEAD and the working tree', () => {
  const args = parseCheckArgs(['--package=postcss-merge-rules']);
  assert.deepEqual(
    [args.base, args.candidate, args.package],
    ['HEAD', 'worktree', 'postcss-merge-rules']
  );
});

test('parseCheckArgs rejects a run that names neither a package nor a case', () => {
  assert.throws(() => parseCheckArgs([]), /--package=<name> or --case=<name>/v);
});

test('parseCheckArgs rejects an unknown flag instead of ignoring it', () => {
  assert.throws(
    () => parseCheckArgs(['--case=a', '--bogus=1']),
    /unknown option --bogus/v
  );
});

test('resolveRevision turns a ref into the full commit hash', () => {
  const sha = 'a'.repeat(40);
  const runner = (command, args) => {
    assert.deepEqual(
      [command, args],
      ['git', ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}']]
    );
    return `${sha}\n`;
  };
  assert.equal(resolveRevision('HEAD', runner), sha);
});

function failingRunner() {
  throw new Error('exit 1');
}

test('resolveRevision names the ref that does not resolve', () => {
  const runner = failingRunner;
  assert.throws(
    () => resolveRevision('nope', runner),
    /cannot resolve "nope"/v
  );
});

test('summaryFor reports the direction, ratio and interval of TOTAL as plain data', () => {
  const summary = summaryFor('a', {
    overallVerdict: 'inconclusive',
    total: {
      ratio: 1.02,
      statisticalDirection: 'inconclusive',
      practicalConclusion: 'within-margin',
      confidenceIntervalPct: { low: -3, high: 7 },
    },
    blocks: [{}, {}, {}, {}],
  });
  assert.deepEqual(summary, {
    case: 'a',
    verdict: 'inconclusive',
    direction: 'inconclusive',
    practical: 'within-margin',
    ratio: 1.02,
    intervalPct: [-3, 7],
    blocks: 4,
  });
});

test('summaryFor reports a missing analysis as unavailable', () => {
  assert.equal(summaryFor('a', { blocks: [] }).verdict, 'unavailable');
});
