// Preflight validates everything that would otherwise waste a long stable
// run: revisions, dependencies, corpus identity, metadata compatibility, and
// one smoke process per side with an output-hash comparison. Output changes
// stay explicit: the phase prints the exact approval command instead of
// silently continuing.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertRevision } from './bench-provenance.js';
import { resolveBenchmarkTarget } from './bench-cases.js';
import { compareCorpora } from './compare-corpora.js';
import { approvalCommand, smokeArguments } from './compare-command.js';

export { compareCorpora, approvalCommand };

const METADATA_FIELDS = [
  'schemaVersion',
  'preset',
  'target',
  'node',
  'platform',
  'arch',
  'mode',
  'warmup',
  'iters',
  'seed',
  'finalizationMode',
  'corpusHash',
  'benchmarkConfigHash',
];

function defaultSpawn(args, options) {
  try {
    execFileSync(args[0], args.slice(1), {
      stdio: ['ignore', 'ignore', 'inherit'],
      ...options,
    });
    return 0;
  } catch (error) {
    return error.status ?? 1;
  }
}

function metadataDifferences(base, candidate) {
  const differences = [];
  for (const field of METADATA_FIELDS) {
    if (base[field] !== candidate[field]) {
      differences.push(`${field}: ${base[field]} vs ${candidate[field]}`);
    }
  }
  const baseFlags = JSON.stringify(base.environment?.nodeFlags ?? null);
  const candidateFlags = JSON.stringify(
    candidate.environment?.nodeFlags ?? null
  );
  if (baseFlags !== candidateFlags) {
    differences.push(
      `environment.nodeFlags: ${baseFlags} vs ${candidateFlags}`
    );
  }
  return differences;
}

function comparisonSides(config) {
  return [
    ['baseline', config.baseDir, config.baseRevision],
    ['candidate', config.candidateDir, config.candidateRevision],
  ];
}

function validateCheckouts(config, sides, log, failures) {
  for (const [side, dir, revision] of sides) {
    try {
      assertRevision(revision, dir);
      log.push(`${side}: revision ${revision} matches checkout HEAD`);
    } catch (error) {
      failures.push(`${side} revision: ${error.message}`);
    }
    if (!existsSync(join(dir, 'node_modules'))) {
      failures.push(
        `${side} dependencies: ${join(dir, 'node_modules')} is missing; run pnpm install in that worktree`
      );
    }
  }
}

function readConfiguredManifest(config, failures) {
  let manifestNames = null;
  if (config.case || !config.corpusManifest) return manifestNames;
  try {
    manifestNames = readFileSync(config.corpusManifest, 'utf8')
      .split('\n')
      .map((name) => name.trim())
      .filter(Boolean);
  } catch (error) {
    failures.push(`corpus manifest: ${error.message}`);
  }
  return manifestNames;
}

function validateCorpusIdentity(config, log, failures, manifestNames) {
  if (config.case) return;
  const corpus = compareCorpora(
    join(config.baseDir, 'frameworks'),
    join(config.candidateDir, 'frameworks'),
    { only: config.only, manifest: manifestNames }
  );
  if (corpus.base === null || corpus.candidate === null) {
    failures.push(
      'corpus: a frameworks directory is missing; corpus identity cannot be verified'
    );
  } else if (corpus.baseOnly.length || corpus.candidateOnly.length) {
    const manifestPath = join(config.resultsDir, 'common-corpus.txt');
    if (!config.corpusManifest) {
      writeFileSync(manifestPath, `${corpus.common.join('\n')}\n`);
    }
    failures.push(
      `corpora differ: baseline has ${corpus.base.length} fixtures (${corpus.base.length} selected), candidate has ${corpus.candidate.length} fixtures (${corpus.candidate.length} selected); ` +
        `${corpus.baseOnly.length} fixtures only in baseline (${corpus.baseOnly.join(', ') || 'none'}), ` +
        `${corpus.candidateOnly.length} only in candidate (${corpus.candidateOnly.join(', ') || 'none'}). ` +
        `Benchmark the common corpus with: --corpus-manifest=${config.corpusManifest ?? manifestPath}`
    );
  } else if (
    corpus.contentMismatches.length ||
    corpus.baseHash !== corpus.candidateHash
  ) {
    failures.push(
      `corpus contents differ for: ${corpus.contentMismatches.join(', ')}; ` +
        `baseline hash ${corpus.baseHash ?? 'unavailable'} vs candidate hash ${corpus.candidateHash ?? 'unavailable'}; ` +
        'the selected CSS sources are not identical between checkouts, so the corpus cannot be shared'
    );
  } else {
    log.push(
      `corpus: identical (${corpus.common.length} selected fixtures, contents verified, hash ${corpus.baseHash})`
    );
  }
}

function runSmokeChecks(config, sides, spawn, log, failures) {
  const smoke = {};
  for (const [side, dir, revision] of sides) {
    const args = smokeArguments(config, side, dir, revision);
    const status = spawn(args, { cwd: dir, env: process.env });
    if (status !== 0) {
      failures.push(
        `${side} smoke run failed (exit ${status}); fix this before a stable comparison`
      );
    } else {
      log.push(`${side}: smoke run passed`);
    }
    try {
      smoke[side] = JSON.parse(
        readSnapshot(config.resultsDir, `preflight-${side}`)
      );
    } catch (error) {
      failures.push(`${side} smoke snapshot: ${error.message}`);
    }
  }
  return smoke;
}

function validateSmokeResults(config, smoke, expectedTarget, log, failures) {
  if (!smoke.baseline || !smoke.candidate) return;
  for (const [side, snapshot] of Object.entries(smoke)) {
    if (snapshot.target !== expectedTarget) {
      failures.push(
        `metadata: ${side} smoke target "${snapshot.target}" does not match the configured target "${expectedTarget}"`
      );
    }
  }
  const differences = metadataDifferences(smoke.baseline, smoke.candidate);
  if (differences.length) {
    failures.push(
      `metadata is incompatible between sides: ${differences.join('; ')}`
    );
  } else {
    log.push('metadata: sides are compatible');
  }
  const unapproved = outputApprovalsNeeded(config, smoke);
  if (unapproved.length) {
    failures.push(
      `smoke outputs differ for: ${unapproved.map(([name]) => name).join(', ')}`
    );
    log.push('approve every output change explicitly, then rerun with:');
    log.push(`  ${approvalCommand(config, unapproved)}`);
  } else {
    log.push('outputs: identical or explicitly approved');
  }
}

export async function runPreflight(config, { spawn = defaultSpawn } = {}) {
  mkdirSync(config.resultsDir, { recursive: true });
  const log = [];
  const failures = [];
  const sides = comparisonSides(config);
  validateCheckouts(config, sides, log, failures);
  const manifestNames = readConfiguredManifest(config, failures);
  validateCorpusIdentity(config, log, failures, manifestNames);
  const smoke = failures.length
    ? {}
    : runSmokeChecks(config, sides, spawn, log, failures);
  validateSmokeResults(
    config,
    smoke,
    resolveBenchmarkTarget(config.case),
    log,
    failures
  );

  return { ok: failures.length === 0, log, failures };
}

function readSnapshot(resultsDir, label) {
  // Read the smoke snapshot directly; full v3 validation happens later on the
  // real comparison artifact.
  return readFileSync(join(resultsDir, `${label}.json`), 'utf8');
}

function outputApprovalsNeeded(config, smoke) {
  const baseHashes = smoke.baseline.outputHashes ?? {};
  const candidateHashes = smoke.candidate.outputHashes ?? {};
  const names = new Set([
    ...Object.keys(baseHashes),
    ...Object.keys(candidateHashes),
  ]);
  const needed = [];
  for (const name of names) {
    if (baseHashes[name] === candidateHashes[name]) continue;
    const approved = config.outputHashAllowlist?.get?.(name);
    if (
      approved?.base === baseHashes[name] &&
      approved?.candidate === candidateHashes[name]
    )
      continue;
    needed.push([
      name,
      { base: baseHashes[name], candidate: candidateHashes[name] },
    ]);
  }
  return needed;
}
