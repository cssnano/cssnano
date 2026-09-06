import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RESULTS_DIR = join(import.meta.dirname, '..', '..', 'bench-results');

function resolveSnapshot(arg) {
  if (existsSync(arg)) return arg;
  const asLabel = join(RESULTS_DIR, `${arg}.json`);
  if (existsSync(asLabel)) return asLabel;
  throw new Error(
    `no snapshot found for "${arg}" (tried "${arg}" and "${asLabel}")`
  );
}

function legacyRun(snapshot) {
  return {
    index: 1,
    seed: null,
    totalSamples: [snapshot.total.medianMs],
    perFileSamples: Object.fromEntries(
      snapshot.frameworks.map((framework) => [
        framework.name,
        [framework.median],
      ])
    ),
    outputHashes: Object.fromEntries(
      snapshot.frameworks.map((framework) => [
        framework.name,
        framework.outputHash,
      ])
    ),
    summary: {
      total: { medianMs: snapshot.total.medianMs },
      frameworks: snapshot.frameworks.map((framework) => ({
        name: framework.name,
        bytes: framework.bytes,
        medianMs: framework.median,
        outputHash: framework.outputHash,
      })),
    },
    reliability: 'legacy',
  };
}

function validateFrameworks(snapshot, arg) {
  if (
    !Array.isArray(snapshot.frameworks) ||
    !snapshot.frameworks.length ||
    !snapshot.total ||
    !Number.isFinite(snapshot.total.medianMs)
  ) {
    throw new TypeError(`invalid benchmark snapshot: "${arg}"`);
  }
  for (const framework of snapshot.frameworks) {
    if (
      typeof framework.name !== 'string' ||
      !Number.isFinite(framework.bytes) ||
      !Number.isFinite(framework.median ?? framework.medianMs)
    ) {
      throw new TypeError(`invalid benchmark entry in snapshot: "${arg}"`);
    }
  }
  if (
    new Set(snapshot.frameworks.map((framework) => framework.name)).size !==
    snapshot.frameworks.length
  ) {
    throw new Error(`duplicate benchmark entry in snapshot: "${arg}"`);
  }
}

export function loadSnapshot(arg) {
  const path = resolveSnapshot(arg);
  const snapshot = JSON.parse(readFileSync(path, 'utf8'));
  if (!snapshot || typeof snapshot !== 'object') {
    throw new TypeError(`invalid benchmark snapshot: "${arg}"`);
  }

  if (snapshot.schemaVersion === 2) {
    if (!Array.isArray(snapshot.runs) || !snapshot.runs.length) {
      throw new TypeError(`invalid benchmark runs in snapshot: "${arg}"`);
    }
    for (const run of snapshot.runs) {
      if (
        !Number.isInteger(run.index) ||
        !run.summary?.total ||
        !Number.isFinite(run.summary.total.medianMs) ||
        !run.outputHashes ||
        !Array.isArray(run.summary.frameworks)
      ) {
        throw new TypeError(`invalid benchmark run in snapshot: "${arg}"`);
      }
    }
    validateFrameworks(snapshot, arg);
    return { ...snapshot, path, legacy: false };
  }

  validateFrameworks(snapshot, arg);
  return {
    ...snapshot,
    schemaVersion: 1,
    path,
    legacy: true,
    seed: snapshot.seed ?? null,
    runs: [legacyRun(snapshot)],
  };
}

export function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  return JSON.stringify(value, Object.keys(value).toSorted());
}
