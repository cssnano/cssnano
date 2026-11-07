import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { casesFor, parseOptions, runCase } from '../bench.js';
import { benchmarkCases, benchmarkSets } from '../cases/index.js';

test('a run without --seed draws a new seed each time', () => {
  const first = parseOptions([]).seed;
  const second = parseOptions([]).seed;
  assert.notEqual(first, second);
});

test('--seed replays the given seed', () => {
  assert.equal(parseOptions(['--seed=replay-1']).seed, 'replay-1');
});

test('--seed rejects an empty seed', () => {
  assert.throws(
    () => parseOptions(['--seed=']),
    /--seed must be a non-empty string/v
  );
});

const COMPARISON = { dirs: { baseline: 'baseline', candidate: 'candidate' } };

// Fake children whose timings depend on the side and on how many blocks that
// side has already run. `outputs` overrides the output hash per side.
function fakeRunner(timings, outputs = {}) {
  const blocksRun = { baseline: 0, candidate: 0 };
  return (name, side) => {
    const block = blocksRun[side]++;
    const { medianMs, coldStartMs } = timings(side, block);
    return {
      medianMs,
      coldStartMs,
      maxRSS: 1,
      outputHashes: { [name]: outputs[side] ?? 'same' },
      perFileMedianMs: { [name]: medianMs },
    };
  };
}

// Alternating jitter gives a positive residual variance, so the intervals are
// finite and narrow.
const jitter = (block) => (block % 2 === 0 ? 0.01 : -0.01);

// A swing of ±3 ms, large enough that no interval settles.
const alternating = (block) => (block % 2 === 0 ? 3 : -3);

// Runs one case where each child advances the fake clock by stepMs.
function runWithClock(runner, { budgetMs = Infinity, stepMs = 0 } = {}) {
  let clock = 0;
  return runCase('fixture', COMPARISON, {
    budgetMs,
    allowOutputChange: false,
    seed: 'test-seed',
    run: (name, side) => {
      clock += stepMs;
      return runner(name, side);
    },
    pause: () => {},
    now: () => clock,
  });
}

test('a cold-start regression alone flags the case', () => {
  const runner = fakeRunner((side, block) => ({
    medianMs: 10,
    coldStartMs: (side === 'candidate' ? 13 : 10) + jitter(block),
  }));
  const result = runWithClock(runner);
  assert.equal(result.verdict, 'regression');
  assert.match(result.reason, /cold start/v);
});

test('a case stops at the first pair where both endpoints have decided', () => {
  const runner = fakeRunner((side, block) => ({
    medianMs: 10 + jitter(block) * 0.1,
    coldStartMs: 10 + jitter(block) * 0.1,
  }));
  const result = runWithClock(runner);
  assert.equal(result.blocks.length, 4);
  assert.equal(result.verdict, 'no-meaningful-change');
});

test('a case keeps measuring while the cold start is undecided', () => {
  // The warm runtime is exact, but the cold start swings so widely that its
  // interval never settles, so the case runs to the requested block count.
  const runner = fakeRunner((side, block) => ({
    medianMs: 10,
    coldStartMs: side === 'candidate' ? 10 + alternating(block) : 10,
  }));
  const result = runWithClock(runner);
  assert.equal(result.blocks.length, 20);
  assert.equal(result.verdict, 'inconclusive');
});

test('a case runs at least the minimum number of blocks even past the budget', () => {
  // Each child takes a second, so the budget is spent before the first pair.
  const runner = fakeRunner((side, block) => ({
    medianMs: 10 + jitter(block),
    coldStartMs: 10 + jitter(block),
  }));
  const result = runWithClock(runner, { budgetMs: 0, stepMs: 1000 });
  assert.equal(result.blocks.length, 4);
});

test('a case stops on the time budget when another pair would not fit', () => {
  // Only the candidate swings, so neither endpoint settles before the budget.
  const runner = fakeRunner((side, block) => {
    const swing = side === 'candidate' ? alternating(block) : 0;
    return { medianMs: 10 + swing, coldStartMs: 10 + swing };
  });
  const result = runWithClock(runner, { budgetMs: 10_000, stepMs: 1000 });
  assert.ok(result.blocks.length < 20);
  assert.match(result.reason, /time budget reached/v);
});

test('a changed output stops the case before any timing is trusted', () => {
  const runner = fakeRunner(() => ({ medianMs: 10, coldStartMs: 10 }), {
    candidate: 'different',
  });
  const result = runWithClock(runner);
  assert.equal(result.verdict, 'inconclusive');
  assert.match(result.reason, /output changed: fixture/v);
});

test('a case result reports the order effect for --json', () => {
  const runner = fakeRunner((side, block) => ({
    medianMs: 10 + jitter(block) * 0.1,
    coldStartMs: 10 + jitter(block) * 0.1,
  }));
  const result = runWithClock(runner);
  assert.equal(typeof result.orderEffect, 'number');
  assert.equal(typeof result.orderStable, 'boolean');
});

test('a run that fails before measuring still ends with a done line', () => {
  const { stdout, status } = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('../bench.js', import.meta.url)),
      '--case=nonexistent',
    ],
    { encoding: 'utf8' }
  );
  assert.equal(status, 1);
  assert.equal(stdout.trimEnd().split('\n').at(-1), 'bench: done status=fail');
});

test('the budget of a case defaults to ten minutes', () => {
  assert.equal(parseOptions([]).budgetMs, 600_000);
});

test('--set names the cases of the set', () => {
  assert.deepEqual(casesFor(parseOptions(['--set=merge-ir'])), [
    'merge-rules-dense',
    'merge-rules-nested-declarations',
    'merge-duplicates-dense',
    'merge-pass-duplicates',
  ]);
});

test('every case of every set exists', () => {
  for (const [set, names] of Object.entries(benchmarkSets)) {
    for (const name of names) {
      assert.ok(Object.hasOwn(benchmarkCases, name), `${set}: ${name}`);
    }
  }
});

test('an unknown --set fails with the names of the sets', () => {
  assert.throws(
    () => casesFor(parseOptions(['--set=nonesuch'])),
    /unknown set "nonesuch"; use merge-ir/v
  );
});

test('--case, --package, --set and --corpus exclude each other', () => {
  assert.throws(
    () => parseOptions(['--case=merge-rules-dense', '--set=merge-ir']),
    /choose one of --case, --package, --set, --corpus/v
  );
});

test('a run that names no cases fails and says what to pass', () => {
  assert.throws(() => casesFor(parseOptions([])), /choose one of --case/v);
});

test('a case reports its progress after each pair', () => {
  const lines = [];
  let clock = 0;
  const runner = fakeRunner((side, block) => ({
    medianMs: 10 + jitter(block),
    coldStartMs: 10 + jitter(block),
  }));
  runCase('fixture', COMPARISON, {
    budgetMs: Infinity,
    allowOutputChange: false,
    seed: 'test-seed',
    run: (name, side) => {
      clock += 1000;
      return runner(name, side);
    },
    pause: () => {},
    now: () => clock,
    progress: (line) => lines.push(line),
  });
  assert.deepEqual(
    [
      lines[0],
      /^bench: fixture block 4\/20 elapsed=8s runtime=\S+ cold-start=\S+$/v.test(
        lines[3]
      ),
    ],
    [
      'bench: fixture block 1/20 elapsed=2s runtime=pending cold-start=pending',
      true,
    ]
  );
});

test('the cases of a set cannot be changed through casesFor', () => {
  assert.throws(
    () => casesFor(parseOptions(['--set=merge-ir'])).push('x'),
    TypeError
  );
});
