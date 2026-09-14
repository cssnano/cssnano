import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { corpusManifest } from './bench-corpus.mjs';
import {
  assertRevision,
  createProvenance,
  currentGitRevision,
  repositoryHashes,
} from './bench-provenance.mjs';
import { loadSnapshot } from './compare-snapshot-io.mjs';

test('repository provenance exposes separate harness, source, and lockfile hashes', () => {
  const hashes = repositoryHashes();
  assert.match(hashes.benchmarkHarnessHash, /^[\da-f]{64}$/u);
  assert.match(hashes.sourceTreeHash, /^[\da-f]{64}$/u);
  assert.match(hashes.lockfileHash, /^[\da-f]{64}$/u);
});

test('corpus changes alter the corpus hash', () => {
  const first = corpusManifest([{ name: 'fixture', source: 'one' }]);
  const second = corpusManifest([{ name: 'fixture', source: 'two' }]);
  assert.notEqual(first, second);
});

test('a false revision is rejected', () => {
  assert.throws(
    () => assertRevision('0'.repeat(40), process.cwd()),
    /does not match checkout HEAD/
  );
  assert.match(currentGitRevision(), /^[\da-f]{40}$/u);
});

function temporaryRepository() {
  const root = mkdtempSync(join(tmpdir(), 'cssnano-provenance-'));
  mkdirSync(join(root, 'util', 'benchmark'), { recursive: true });
  mkdirSync(join(root, 'packages', 'fixture', 'src'), { recursive: true });
  mkdirSync(join(root, 'packages', 'fixture'), { recursive: true });
  mkdirSync(join(root, 'frameworks'), { recursive: true });
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      scripts: {
        bench: 'node util/benchmark/worker.mjs',
        test: 'node test.mjs',
      },
    })
  );
  writeFileSync(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  writeFileSync(
    join(root, 'util', 'benchmark', 'worker.mjs'),
    'export const worker = 1;\n'
  );
  writeFileSync(join(root, '.github-workflow'), 'workflow\n');
  writeFileSync(join(root, 'packages', 'fixture', 'package.json'), '{}\n');
  writeFileSync(
    join(root, 'packages', 'fixture', 'src', 'index.js'),
    'export default 1;\n'
  );
  writeFileSync(join(root, 'frameworks', 'fixture.css'), '.a{}\n');
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], {
      cwd: root,
    });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'initial'], { cwd: root });
  } catch {
    return null;
  }
  return root;
}

test('provenance hash domains are explicit and non-overlapping', (t) => {
  const root = temporaryRepository();
  if (!root)
    return t.skip('nested git repositories are unavailable in this runner');
  const initial = repositoryHashes(root);
  writeFileSync(
    join(root, 'util', 'benchmark', 'worker.mjs'),
    'export const worker = 2;\n'
  );
  const worker = repositoryHashes(root);
  assert.notEqual(worker.benchmarkHarnessHash, initial.benchmarkHarnessHash);
  assert.equal(worker.sourceTreeHash, initial.sourceTreeHash);
  assert.equal(worker.lockfileHash, initial.lockfileHash);

  writeFileSync(
    join(root, 'packages', 'fixture', 'src', 'index.js'),
    'export default 2;\n'
  );
  const source = repositoryHashes(root);
  assert.notEqual(source.sourceTreeHash, worker.sourceTreeHash);
  assert.equal(source.benchmarkHarnessHash, worker.benchmarkHarnessHash);

  writeFileSync(
    join(root, 'pnpm-lock.yaml'),
    'lockfileVersion: 9\nchanged: true\n'
  );
  const lockfile = repositoryHashes(root);
  assert.notEqual(lockfile.lockfileHash, source.lockfileHash);
  assert.equal(lockfile.sourceTreeHash, source.sourceTreeHash);

  const corpusBefore = corpusManifest([
    {
      name: 'fixture',
      source: readFileSync(join(root, 'frameworks', 'fixture.css'), 'utf8'),
    },
  ]);
  writeFileSync(join(root, 'frameworks', 'fixture.css'), '.b{}\n');
  const corpusAfter = corpusManifest([
    {
      name: 'fixture',
      source: readFileSync(join(root, 'frameworks', 'fixture.css'), 'utf8'),
    },
  ]);
  assert.notEqual(corpusAfter, corpusBefore);
  const corpusTree = repositoryHashes(root);
  assert.deepEqual(corpusTree, lockfile);

  const packageJsonPath = join(root, 'package.json');
  writeFileSync(
    packageJsonPath,
    JSON.stringify({
      scripts: { bench: 'node util/benchmark/worker.mjs', test: 'changed' },
    })
  );
  assert.equal(
    repositoryHashes(root).benchmarkHarnessHash,
    lockfile.benchmarkHarnessHash
  );
});

test('dirty provenance paths are sorted deterministically', (t) => {
  const root = temporaryRepository();
  if (!root)
    return t.skip('nested git repositories are unavailable in this runner');
  writeFileSync(join(root, 'z.txt'), 'z');
  writeFileSync(join(root, 'a.txt'), 'a');
  const provenance = createProvenance({ root, corpusHash: 'a'.repeat(64) });
  assert.deepEqual(provenance.dirtyPaths, ['a.txt', 'z.txt']);
  assert.equal(provenance.dirty, true);
});

test('schema-v3 snapshots reject missing decision configuration', () => {
  const root = mkdtempSync(join(tmpdir(), 'cssnano-v3-'));
  const path = join(root, 'invalid.json');
  writeFileSync(path, JSON.stringify({ schemaVersion: 3 }));
  assert.throws(() => loadSnapshot(path), /configuration/);

  const invalidPath = join(root, 'invalid-value.json');
  writeFileSync(
    invalidPath,
    JSON.stringify({
      schemaVersion: 3,
      configuration: {
        superiorityConfidenceLevel: 0.95,
        equivalenceConfidenceLevel: 0.9,
        runtimeNonRegressionMargin: 1.1,
        practicalEquivalenceMargin: 1.1,
        bootstrapResamples: 0,
        bootstrapSeed: 'seed',
        minimumBlocks: 5,
        requestedBlocks: 20,
        precisionTarget: 0.05,
        orderInteractionThreshold: 0.05,
        intervalMethod: 'stratified-percentile-bootstrap',
        analyzerVersion: '3.0.0',
        mode: 'stable',
        warmup: 20,
        iters: 100,
        preset: 'default',
        target: 'cssnano',
        case: null,
        corpusSelector: null,
        nodeEnv: 'production',
      },
    })
  );
  assert.throws(() => loadSnapshot(invalidPath), /bootstrapResamples/);
});
