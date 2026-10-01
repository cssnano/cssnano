import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeOutcome } from './fuzzAgainstRevision.js';
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
