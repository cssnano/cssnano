import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { describeOutcome, withRevisionPackage } from './fuzzAgainstRevision.js';
import { FAILURE_EXIT_CODE } from './fuzzRunner.js';

test('describeOutcome reports a clean run as passed', () => {
  assert.equal(describeOutcome({ status: 0, signal: null }), 'passed');
});

test('describeOutcome reports the runner failure code as a counterexample', () => {
  assert.match(
    describeOutcome({ status: FAILURE_EXIT_CODE, signal: null }),
    /^found a counterexample/v
  );
});

test('describeOutcome does not mistake a crash for a counterexample', () => {
  assert.match(
    describeOutcome({ status: 1, signal: null }),
    /^could not run \(exit 1\)/v
  );
});

test('describeOutcome does not mistake an invalid option for a counterexample', () => {
  assert.match(
    describeOutcome({ status: 2, signal: null }),
    /^could not run \(exit 2\)/v
  );
});

test('describeOutcome names the signal that stopped the fuzzer', () => {
  assert.match(
    describeOutcome({ status: null, signal: 'SIGINT' }),
    /^could not run \(SIGINT\)/v
  );
});

test('withRevisionPackage runs with the src of the revision', () => {
  withRevisionPackage('HEAD', (src) => {
    assert.ok(existsSync(join(src, 'presets', 'default.js')));
  });
});

test('withRevisionPackage removes its sandbox after the run', () => {
  let sandbox = '';
  withRevisionPackage('HEAD', (src) => {
    sandbox = dirname(src);
  });

  assert.ok(!existsSync(sandbox));
});

test('withRevisionPackage removes its sandbox when the run throws', () => {
  let sandbox = '';
  assert.throws(() =>
    withRevisionPackage('HEAD', (src) => {
      sandbox = dirname(src);
      throw new Error('run failed');
    })
  );

  assert.ok(!existsSync(sandbox));
});

test('withRevisionPackage rejects a revision without a cssnano src', () => {
  assert.throws(
    () => withRevisionPackage('HEAD~100000', () => {}),
    /has no packages\/cssnano\/src/v
  );
});
