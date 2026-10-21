import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { benchmarkCases } from '../cases/index.js';
import { measureProcess } from '../child.js';

const CHILD = new URL('../child.js', import.meta.url).pathname;
const [CASE] = Object.keys(benchmarkCases).toSorted();

function runChild(args) {
  const stdout = execFileSync(process.execPath, [CHILD, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return JSON.parse(stdout.trim());
}

test('child prints one JSON line with the timing and output fields', () => {
  const result = runChild([`--case=${CASE}`]);
  assert.ok(result.medianMs > 0);
  assert.ok(result.coldStartMs > 0);
  assert.ok(result.maxRSS > 0);
  assert.deepEqual(Object.keys(result.outputHashes), [CASE]);
  assert.deepEqual(Object.keys(result.perFileMedianMs), [CASE]);
});

test('child reports the same output hashes for the same input', () => {
  const first = runChild([`--case=${CASE}`]);
  const second = runChild([`--case=${CASE}`]);
  assert.deepEqual(second.outputHashes, first.outputHashes);
});

const TIMED_PASSES = 10;
const CORPUS = [{ name: 'fixture', source: 'a{}' }];

// A processor whose every call takes msPerCall on a fake clock, so warm-up
// and timing are checked without depending on the machine.
function fakeProcessor(clock, msPerCall) {
  const starts = [];
  return {
    starts,
    process: async (css) => {
      starts.push(clock.now);
      clock.now += msPerCall;
      return { css };
    },
  };
}

// 100 ms passes fill a sample each, and five of them are needed for 500 ms.
test('timed passes start only after 500 ms of warm-up', async () => {
  const clock = { now: 0 };
  const processor = fakeProcessor(clock, 100);
  await measureProcess(CORPUS, processor, { now: () => clock.now });
  const firstTimedStart = processor.starts.at(-TIMED_PASSES);
  assert.ok(firstTimedStart >= 500, `timing began at ${firstTimedStart} ms`);
});

// With 1 ms passes, the cold pass and 500 warm-up passes end at 501 ms.
const WARM_UP_END_MS = 501;

test('passes shorter than 50 ms repeat until each timed sample lasts 50 ms', async () => {
  const clock = { now: 0 };
  const processor = fakeProcessor(clock, 1);
  await measureProcess(CORPUS, processor, { now: () => clock.now });
  const timed = processor.starts.filter((start) => start >= WARM_UP_END_MS);
  assert.equal(timed.length, TIMED_PASSES * 50);
});

test('runtime median is the time of one pass, not of a batch of passes', async () => {
  const clock = { now: 0 };
  const processor = fakeProcessor(clock, 1);
  const result = await measureProcess(CORPUS, processor, {
    now: () => clock.now,
  });
  assert.equal(result.medianMs, 1);
});

test('per-file median is the time of one pass, not of a batch of passes', async () => {
  const clock = { now: 0 };
  const processor = fakeProcessor(clock, 1);
  const result = await measureProcess(CORPUS, processor, {
    now: () => clock.now,
  });
  assert.equal(result.perFileMedianMs.fixture, 1);
});

test('warm-up runs three passes even when one pass already exceeds 500 ms', async () => {
  const clock = { now: 0 };
  const processor = fakeProcessor(clock, 300);
  await measureProcess(CORPUS, processor, { now: () => clock.now });
  // One cold pass, then the three warm passes that the minimum requires.
  assert.equal(processor.starts.length - TIMED_PASSES, 4);
});
