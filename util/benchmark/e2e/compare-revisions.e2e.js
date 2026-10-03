import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '../../..');

// Earlier comparison tests stubbed out bench.js, so two bugs in the real
// process hand-off shipped. Comparing HEAD with itself exercises the real
// preflight, block runs and report without needing a second worktree.
test('compare-revisions.js reports a verdict from real paired benchmark runs', () => {
  const resultsDir = mkdtempSync(join(tmpdir(), 'cssnano-compare-e2e-'));
  const revision = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }).stdout.trim();
  try {
    const run = spawnSync(
      process.execPath,
      [
        'util/benchmark/compare-revisions.js',
        `--base-dir=${repositoryRoot}`,
        `--candidate-dir=${repositoryRoot}`,
        `--base-revision=${revision}`,
        `--candidate-revision=${revision}`,
        `--results-dir=${resultsDir}`,
        '--mode=quick',
        '--case=comments-declaration-values',
        '--no-adaptive',
        '--blocks=6',
      ],
      { cwd: repositoryRoot, encoding: 'utf8' }
    );
    assert.equal(run.status, 0, run.stderr);
    const lines = run.stdout.split('\n');
    const reportStart = lines.findIndex((line) =>
      line.endsWith('comparison-report.json')
    );
    assert.ok(reportStart >= 0, 'the report was not written');
    assert.match(lines[reportStart + 1], /^VERDICT: /v);
  } finally {
    rmSync(resultsDir, { recursive: true, force: true });
  }
});
