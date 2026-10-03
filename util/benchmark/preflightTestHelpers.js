import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function temporaryDirectory(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function chmodRecursive(dir) {
  // Git objects are read-only; recursive removal needs write bits restored.
  try {
    execFileSync('chmod', ['-R', 'u+w', dir]);
  } catch {
    // best effort
  }
}

export function cleanupConfig(config) {
  for (const dir of [config.baseDir, config.candidateDir, config.resultsDir]) {
    chmodRecursive(dir);
    rmSync(dir, { recursive: true, force: true });
  }
}

export function baseConfig(overrides = {}) {
  const resultsDir = temporaryDirectory('cssnano-preflight-results-');
  return {
    baseDir: temporaryDirectory('cssnano-preflight-base-'),
    candidateDir: temporaryDirectory('cssnano-preflight-candidate-'),
    resultsDir,
    baseRevision: '1'.repeat(40),
    candidateRevision: '2'.repeat(40),
    mode: 'stable',
    preset: 'default',
    seed: 'test-seed',
    case: null,
    only: null,
    corpusManifest: null,
    outputHashAllowlist: new Map(),
    ...overrides,
  };
}

export function prepareCheckout(dir, fixtureFile = null) {
  mkdirSync(join(dir, 'frameworks'), { recursive: true });
  if (fixtureFile) {
    writeFileSync(join(dir, 'frameworks', fixtureFile), '.fixture{}\n');
  }
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], {
    cwd: dir,
  });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-qm', 'initial', '--allow-empty'], {
    cwd: dir,
  });
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: dir,
    encoding: 'utf8',
  }).trim();
}

export function smokeSnapshot(side, outputHash, overrides = {}) {
  return JSON.stringify({
    schemaVersion: 3,
    preset: 'default',
    target: 'cssnano',
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    mode: 'quick',
    warmup: 0,
    iters: 1,
    seed: 'test-seed',
    finalizationMode: 'production',
    corpusHash: 'c'.repeat(64),
    outputHashes: { fixture: outputHash },
    environment: { nodeFlags: [], nodeEnv: 'production' },
    ...overrides,
  });
}
