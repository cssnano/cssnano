import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { benchmarkCases, caseFileOf } from '../cases/index.js';
import { measureProcess } from '../child.js';

const CHILD = fileURLToPath(new URL('../child.js', import.meta.url));
const [CASE] = Object.keys(benchmarkCases).toSorted();
const CASE_ARGS = [`--case=${CASE}`, `--module=${caseFileOf[CASE]}`];

function runChild(args, nodeOptions = []) {
  const stdout = execFileSync(
    process.execPath,
    [...nodeOptions, CHILD, ...args],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }
  );
  return JSON.parse(stdout.trim());
}

test('child prints one JSON line with the timing and output fields', () => {
  const result = runChild(CASE_ARGS);
  assert.ok(result.medianMs > 0);
  assert.ok(result.coldStartMs > 0);
  assert.ok(result.maxRSS > 0);
  assert.deepEqual(Object.keys(result.outputHashes), [CASE]);
  assert.deepEqual(Object.keys(result.perFileMedianMs), [CASE]);
});

test('child reports the same output hashes for the same input', () => {
  const first = runChild(CASE_ARGS);
  const second = runChild(CASE_ARGS);
  assert.deepEqual(second.outputHashes, first.outputHashes);
});

// A module hook that fails the child when it resolves a URL that matches,
// so a test can prove that a run never loads those modules.
function failOnResolve(predicate) {
  return `data:text/javascript,${encodeURIComponent(`
    import { registerHooks } from 'node:module';
    const matches = ${predicate};
    registerHooks({
      resolve(specifier, context, nextResolve) {
        const resolved = nextResolve(specifier, context);
        if (matches(resolved.url)) {
          throw new Error('unexpected module ' + resolved.url);
        }
        return resolved;
      },
    });
  `)}`;
}

// The cases reach into the internals of the current source tree, which an
// older base revision lacks, so a corpus run must not load them.
const FAIL_ON_CASES = failOnResolve(
  "(url) => url.endsWith('/benchmark/cases/index.js') || url.includes('/benchmark/cases/bench-cases-')"
);

test('child measures a corpus directory without loading the case modules', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cssnano-child-corpus-'));
  try {
    writeFileSync(join(dir, 'fixture.css'), 'a{color:#ffffff}');
    const result = runChild([`--dir=${dir}`], [`--import=${FAIL_ON_CASES}`]);
    assert.deepEqual(Object.keys(result.outputHashes), ['fixture']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Another case module, to show the child loads only the one it was given.
const OTHER_MODULE = 'bench-cases-stylehacks.js';
const FAIL_ON_OTHER_MODULES = failOnResolve(
  `(url) => url.endsWith('/benchmark/cases/index.js') || url.endsWith('/benchmark/cases/${OTHER_MODULE}')`
);

test('child runs a case without loading the modules of other cases', () => {
  assert.notEqual(caseFileOf[CASE], OTHER_MODULE);
  const result = runChild(CASE_ARGS, [`--import=${FAIL_ON_OTHER_MODULES}`]);
  assert.deepEqual(Object.keys(result.outputHashes), [CASE]);
});

const FAIL_ON_PRESETS = failOnResolve("(url) => url.includes('/src/presets/')");

// A case that builds its processor from one internal module, not a preset.
const OWN_PROCESSOR_CASE = 'stylehacks-detect';

test('child runs a case with its own processor without loading a preset', () => {
  assert.ok(benchmarkCases[OWN_PROCESSOR_CASE].createProcessor);
  const result = runChild(
    [
      `--case=${OWN_PROCESSOR_CASE}`,
      `--module=${caseFileOf[OWN_PROCESSOR_CASE]}`,
    ],
    [`--import=${FAIL_ON_PRESETS}`]
  );
  assert.deepEqual(Object.keys(result.outputHashes), [OWN_PROCESSOR_CASE]);
});

function childError(args) {
  try {
    execFileSync(process.execPath, [CHILD, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch (error) {
    return error.stderr;
  }
  throw new Error('the child succeeded');
}

test('child rejects --module without --case', () => {
  assert.match(
    childError([`--module=${caseFileOf[CASE]}`]),
    /--module needs --case/v
  );
});

test('child reports --case with --dir as a conflict before a missing --module', () => {
  assert.match(
    childError([`--case=${CASE}`, '--dir=.']),
    /cannot be used together/v
  );
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
