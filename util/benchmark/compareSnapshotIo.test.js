import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { snapshot } from './benchTestHelpers.js';
import { loadSnapshot } from './compare-snapshot-io.js';
import { compareSnapshots } from './compare-snapshots.js';

test('comparison rejects mismatched metadata and corpus', () => {
  const base = snapshot([100, 100, 100, 100, 100]);
  const differentSeed = { ...snapshot([90, 90, 90, 90, 90]), seed: 'other' };
  assert.throws(() => compareSnapshots(base, differentSeed), /seed differs/v);
  const differentCorpus = {
    ...snapshot([90, 90, 90, 90, 90]),
    corpusManifest: 'other',
  };
  assert.throws(
    () => compareSnapshots(base, differentCorpus),
    /corpusManifest/v
  );
  assert.throws(
    () => compareSnapshots({ ...base, schemaVersion: 2 }, base),
    /benchmark snapshot must use schema v3/v
  );
  assert.throws(
    () => compareSnapshots(base, { ...base, schemaVersion: 1 }),
    /benchmark snapshot must use schema v3/v
  );
});

function legacySnapshot(label, overrides = {}) {
  return JSON.stringify({
    label,
    preset: 'default',
    target: 'cssnano',
    corpusManifest: 'manifest',
    node: process.version,
    finalizationMode: 'production',
    platform: process.platform,
    arch: process.arch,
    warmup: 20,
    iters: 100,
    total: { medianMs: 10 },
    frameworks: [{ name: 'fixture', bytes: 10, median: 10 }],
    ...overrides,
  });
}

test('legacy v1 and v2 snapshots are rejected by the snapshot loader', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cssnano-benchmark-'));
  const v1Path = join(directory, 'legacy-v1.json');
  writeFileSync(v1Path, legacySnapshot('legacy-v1'));
  assert.throws(
    () => loadSnapshot(v1Path),
    /benchmark snapshot must use schema v3/v
  );

  const v2Path = join(directory, 'legacy-v2.json');
  writeFileSync(
    v2Path,
    legacySnapshot('legacy-v2', { schemaVersion: 2, runs: [] })
  );
  assert.throws(
    () => loadSnapshot(v2Path),
    /benchmark snapshot must use schema v3/v
  );
});

test('snapshot loader rejects negative or zero timings and negative bytes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cssnano-benchmark-'));
  const createTestSnapshot = (overrides) => {
    const path = join(directory, `snap-${Math.random()}.json`);
    writeFileSync(path, JSON.stringify({ ...snapshot([100]), ...overrides }));
    return path;
  };

  assert.throws(
    () => loadSnapshot(createTestSnapshot({ total: { medianMs: -5 } })),
    /must be positive numbers/v
  );
  assert.throws(
    () => loadSnapshot(createTestSnapshot({ total: { medianMs: 0 } })),
    /must be positive numbers/v
  );
  assert.throws(
    () =>
      loadSnapshot(
        createTestSnapshot({
          frameworks: [{ name: 'fixture', bytes: -1, medianMs: 10 }],
        })
      ),
    /bytes must be a non-negative finite number/v
  );
});

test('environment validation checks required runtime fields while ignoring volatile hardware stats', () => {
  const base = snapshot([100, 100, 100, 100, 100]);
  const candWithMemoryFluctuation = {
    ...snapshot([90, 90, 90, 90, 90]),
    environment: {
      ...base.environment,
      totalMemory: 32000000000,
      osRelease: '6.1.0-other',
      cpuModel: 'Different Core String',
    },
  };
  // Should NOT throw on volatile hardware stats
  assert.doesNotThrow(() => compareSnapshots(base, candWithMemoryFluctuation));

  // Should throw on different Node runtime flags or environment
  const candWithDifferentNodeFlags = {
    ...snapshot([90, 90, 90, 90, 90]),
    environment: {
      ...base.environment,
      nodeFlags: ['--expose-gc'],
    },
  };
  assert.throws(
    () => compareSnapshots(base, candWithDifferentNodeFlags),
    /environment\.nodeFlags differs/v
  );
});
