// Preflight validates everything that would otherwise waste a long stable
// run: revisions, dependencies, corpus identity, metadata compatibility, and
// one smoke process per side with an output-hash comparison. Output changes
// stay explicit: the phase prints the exact approval command instead of
// silently continuing.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { assertRevision } from './bench-provenance.mjs';
import { resolveBenchmarkTarget } from './bench-cases.mjs';
import { corpusManifest } from './bench-corpus.mjs';

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

function quote(value) {
  const string = String(value);
  const shellSafe = [...string].every(
    (character) =>
      (character >= 'a' && character <= 'z') ||
      (character >= 'A' && character <= 'Z') ||
      (character >= '0' && character <= '9') ||
      '_./:=,@+%-'.includes(character)
  );
  return shellSafe ? string : `'${string.replaceAll("'", "'\"'\"'")}'`;
}

function corpusNames(dir) {
  if (!existsSync(dir)) return null;
  return readdirSync(dir)
    .filter((file) => file.endsWith('.css'))
    .map((file) => file.slice(0, -'.css'.length))
    .toSorted();
}

function fixtureDigest(dir, name) {
  try {
    return createHash('sha256')
      .update(readFileSync(join(dir, `${name}.css`)))
      .digest('hex');
  } catch {
    return null;
  }
}

function selectedNames(names, { only = null, manifest = null } = {}) {
  let selectors = [];
  if (Array.isArray(only)) selectors = only;
  else if (only) selectors = [only];
  return names.filter(
    (name) =>
      (!manifest || manifest.includes(name)) &&
      (!selectors.length ||
        selectors.some((selector) => name.includes(selector)))
  );
}

function digestCorpus(dir, names) {
  try {
    return corpusManifest(
      names.map((name) => ({
        name,
        source: readFileSync(join(dir, `${name}.css`), 'utf8'),
      }))
    );
  } catch {
    return null;
  }
}

export function compareCorpora(
  baseDir,
  candidateDir,
  { only = null, manifest = null } = {}
) {
  const baseAll = corpusNames(baseDir);
  const candidateAll = corpusNames(candidateDir);
  const base = baseAll && selectedNames(baseAll, { only, manifest });
  const candidate =
    candidateAll && selectedNames(candidateAll, { only, manifest });
  const baseSet = new Set(base ?? []);
  const candidateSet = new Set(candidate ?? []);
  const common = [...baseSet]
    .filter((name) => candidateSet.has(name))
    .toSorted();
  // Identical names are not enough: the sides must process the same CSS
  // sources, so common fixtures are compared by content digest.
  const contentMismatches = common.filter((name) => {
    const baseDigest = fixtureDigest(baseDir, name);
    const candidateDigest = fixtureDigest(candidateDir, name);
    return (
      baseDigest === null ||
      candidateDigest === null ||
      baseDigest !== candidateDigest
    );
  });
  return {
    base,
    candidate,
    common,
    baseHash: base ? digestCorpus(baseDir, base) : null,
    candidateHash: candidate ? digestCorpus(candidateDir, candidate) : null,
    contentMismatches,
    baseOnly: [...baseSet].filter((name) => !candidateSet.has(name)).toSorted(),
    candidateOnly: [...candidateSet]
      .filter((name) => !baseSet.has(name))
      .toSorted(),
  };
}

function smokeArguments(config, side, directory, revision) {
  const args = [
    join(directory, 'util/benchmark/bench.mjs'),
    '--mode=quick',
    '--runs=1',
    `--label=preflight-${side}`,
    `--results-dir=${config.resultsDir}`,
    `--seed=${config.seed}`,
    `--revision=${revision}`,
    `--preset=${config.preset}`,
    '--summary',
  ];
  // The smoke run must exercise the same selection as the comparison, or its
  // metadata and output hashes describe a different benchmark.
  if (config.case) args.push(`--case=${config.case}`);
  for (const selector of config.only ?? []) args.push(`--only=${selector}`);
  if (config.corpusManifest)
    args.push(`--corpus-manifest=${config.corpusManifest}`);
  return args;
}

function appendValueFlags(parts, config) {
  for (const [name, value] of [
    ['blocks', config.blocks],
    ['minimum-blocks', config.minimumBlocks],
    ['requested-blocks', config.requestedBlocks],
    ['pilot-blocks', config.pilotBlocks],
    ['seed', config.seed],
    ['warmup', config.warmup],
    ['iters', config.iters],
    ['precision-target', config.precisionTarget],
    ['order-interaction-threshold', config.orderInteractionThreshold],
    ['superiority-confidence-level', config.superiorityConfidenceLevel],
    ['equivalence-confidence-level', config.equivalenceConfidenceLevel],
    ['runtime-non-regression-margin', config.runtimeNonRegressionMargin],
    ['practical-equivalence-margin', config.practicalEquivalenceMargin],
    ['cooldown-ms', config.cooldown],
  ]) {
    if (value !== undefined && value !== null)
      parts.push(`--${name}=${quote(String(value))}`);
  }
}

function appendSelectionFlags(parts, config) {
  if (config.case) parts.push(`--case=${quote(config.case)}`);
  for (const selector of config.only ?? [])
    parts.push(`--only=${quote(selector)}`);
  if (config.corpusManifest)
    parts.push(`--corpus-manifest=${quote(config.corpusManifest)}`);
}

function appendModeFlags(parts, config) {
  if (config.adaptive) parts.push('--adaptive');
  else if (config.adaptive === false) parts.push('--no-adaptive');
  if (config.pinCore !== null && config.pinCore !== undefined)
    parts.push(`--pin-core=${config.pinCore}`);
  if (config.preflight === true) parts.push('--preflight');
  else if (config.preflight === false) parts.push('--no-preflight');
  if (config.quietChild === true) parts.push('--quiet-child');
  else if (config.quietChild === false) parts.push('--verbose-child');
  if (config.report === true) parts.push('--report');
  else if (config.report === false) parts.push('--no-report');
  if (config.markdown) parts.push(`--markdown=${quote(config.markdown)}`);
  for (const directory of config.cleanupDirs ?? [])
    parts.push(`--cleanup=${quote(directory)}`);
}

function appendApprovalFlags(parts, config, extraApprovals) {
  const approvals = new Map(config.outputHashAllowlist ?? []);
  for (const [name, hashes] of extraApprovals) approvals.set(name, hashes);
  for (const [name, hashes] of approvals)
    parts.push(
      `--allow-output-hash=${name},${hashes.base},${hashes.candidate}`
    );
}

export function approvalCommand(config, extraApprovals = []) {
  const parts = [
    'node util/benchmark/compare-revisions.mjs',
    `--base-revision=${quote(config.baseRevision)}`,
    `--candidate-revision=${quote(config.candidateRevision)}`,
    `--base-dir=${quote(config.baseDir)}`,
    `--candidate-dir=${quote(config.candidateDir)}`,
    `--results-dir=${quote(config.resultsDir)}`,
    `--mode=${config.mode}`,
    `--preset=${config.preset}`,
  ];
  // Emit every configurable setting explicitly so rerunning the printed
  // command reproduces the benchmarked configuration exactly.
  appendValueFlags(parts, config);
  appendModeFlags(parts, config);
  appendSelectionFlags(parts, config);
  appendApprovalFlags(parts, config, extraApprovals);
  return parts.join(' ');
}

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
