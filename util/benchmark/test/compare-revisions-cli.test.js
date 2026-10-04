import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

function runCli(t, ...flags) {
  const resultsDir = mkdtempSync(join(tmpdir(), 'cssnano-cli-'));
  t.after(() => rmSync(resultsDir, { recursive: true, force: true }));
  return spawnSync(
    process.execPath,
    [
      new URL('../compare-revisions.js', import.meta.url).pathname,
      '--base-dir=/nonexistent/base',
      '--candidate-dir=/nonexistent/candidate',
      `--results-dir=${resultsDir}`,
      `--base-revision=${'1'.repeat(40)}`,
      `--candidate-revision=${'2'.repeat(40)}`,
      ...flags,
    ],
    { encoding: 'utf8' }
  );
}

test('CLI rejects --blocks below 4 for a fixed-length run', (t) => {
  const result = runCli(
    t,
    '--no-adaptive',
    '--blocks=2',
    '--requested-blocks=2',
    '--minimum-blocks=2',
    '--pilot-blocks=2'
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--blocks must be at least 4/v);
});

test('CLI rejects --requested-blocks below 4 for an adaptive run', (t) => {
  const result = runCli(
    t,
    '--adaptive',
    '--requested-blocks=2',
    '--minimum-blocks=2',
    '--pilot-blocks=2'
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--requested-blocks must be at least 4/v);
});

test('CLI ignores --blocks below 4 for an adaptive run, which plans --requested-blocks', (t) => {
  const result = runCli(t, '--adaptive', '--blocks=2', '--requested-blocks=20');
  // Reaching preflight proves block validation accepted the options.
  assert.match(result.stderr, /preflight:/v);
  assert.doesNotMatch(result.stderr, /must be at least 4/v);
});

test('CLI names the missing --base-dir instead of crashing', () => {
  const result = spawnSync(
    process.execPath,
    [
      new URL('../compare-revisions.js', import.meta.url).pathname,
      '--candidate-dir=/nonexistent/candidate',
      '--results-dir=/nonexistent/results',
      `--base-revision=${'1'.repeat(40)}`,
      `--candidate-revision=${'2'.repeat(40)}`,
    ],
    { encoding: 'utf8' }
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--base-dir is required/v);
  assert.doesNotMatch(result.stderr, /TypeError/v);
});

test('CLI reports a revision that does not resolve in its checkout', (t) => {
  const result = runCli(t, '--base-revision=no-such-ref');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /cannot resolve "no-such-ref"/v);
});

test('CLI rejects a time budget that is not a duration', (t) => {
  const result = runCli(t, '--time-budget=soon');
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /--time-budget must be a duration such as 90s or 5m/v
  );
});
